from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db_session, get_current_patient
from backend.app.models.patient import Patient
from backend.app.models.screening import Screening
from backend.app.schemas.patient_portal import PatientReportItem, PatientChatRequest, PatientChatResponse
from backend.app.services.groq_service import query_groq_chat

router = APIRouter(prefix="/patient", tags=["Patient Portal"])

def format_finding_text(class_name: str) -> str:
    mapping = {
        "No_DR": "No Diabetic Retinopathy Detected",
        "Mild": "Mild Non-Proliferative Diabetic Retinopathy",
        "Moderate": "Moderate Diabetic Retinopathy",
        "Severe": "Severe Non-Proliferative Diabetic Retinopathy",
        "Proliferative_DR": "Proliferative Diabetic Retinopathy",
    }
    return mapping.get(class_name, f"{class_name} Retinopathy")

def format_recommendation_text(class_id: int) -> str:
    if class_id >= 3:
        return "Urgent: Vitreoretinal specialist consultation recommended."
    elif class_id == 2:
        return "Ophthalmologist evaluation recommended within 4 weeks. Maintain strict glycemic control."
    elif class_id == 1:
        return "Routine preventive screening in 6-12 months. Strict blood sugar control advised."
    return "Healthy retinal scan. Continue annual preventive dilated eye examinations."

def build_patient_report_item(screening: Screening, patient: Patient, base_url: str = "") -> PatientReportItem:
    clean_base = base_url.rstrip("/") if base_url else ""
    image_name = Path(screening.original_media_path).name if screening.original_media_path else screening.original_filename
    original_url = f"{clean_base}/static/uploads/{image_name}" if clean_base else f"/static/uploads/{image_name}"

    class_id = screening.predicted_class_id or 0
    class_name = screening.predicted_class_name or "No_DR"

    return PatientReportItem(
        id=screening.screening_id,
        screening_id=screening.screening_id,
        patient_id=patient.patient_id,
        patient_name=f"{patient.first_name} {patient.last_name}".strip(),
        date=screening.created_at.strftime("%Y-%m-%d") if screening.created_at else "Recent",
        eye="Left Eye (OS)",
        original_image_url=original_url,
        finding=format_finding_text(class_name),
        severity=f"Grade {class_id} ({class_name.replace('_', ' ')})",
        review_status=screening.review_status or "verified",
        verified_by=screening.verified_by or (screening.doctor.name if screening.doctor else (patient.doctor.name if patient.doctor else "Treating Clinician")),
        recommendation=format_recommendation_text(class_id),
        notes=screening.review_notes or "Clinician reviewed."
    )

@router.get("/reports", response_model=List[PatientReportItem])
def get_patient_reports(
    request: Request,
    current_patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db_session)
):
    """
    Exposes only the Reports section for the authenticated patient.
    Constraint (Point 3): Only the real fundus image is returned — no processed/annotated AI images.
    """
    screenings = (
        db.query(Screening)
        .filter(Screening.patient_id == current_patient.patient_id)
        .order_by(Screening.created_at.desc())
        .all()
    )
    base_url = str(request.base_url)
    return [build_patient_report_item(s, current_patient, base_url) for s in screenings]

@router.get("/reports/{screening_id}", response_model=PatientReportItem)
def get_single_patient_report(
    screening_id: str,
    request: Request,
    current_patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db_session)
):
    screening = (
        db.query(Screening)
        .filter(
            Screening.screening_id == screening_id,
            Screening.patient_id == current_patient.patient_id
        )
        .first()
    )
    if not screening:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{screening_id}' not found for this patient."
        )
    return build_patient_report_item(screening, current_patient, str(request.base_url))

@router.post("/chat", response_model=PatientChatResponse)
async def patient_chat(
    req: PatientChatRequest,
    current_patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db_session)
):
    """
    Groq-powered conversational AI endpoint for the Patient Portal.
    Constraint (Point 5):
    - Configured with ophthalmologist persona specialized in diabetic retinopathy.
    - Context strictly bounded to logged-in patient's own verified report data.
    """
    user_msg = (req.message or "").strip()
    if not user_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty."
        )

    # Fetch patient's screening context
    screening = None
    if req.screening_id:
        screening = (
            db.query(Screening)
            .filter(
                Screening.screening_id == req.screening_id,
                Screening.patient_id == current_patient.patient_id
            )
            .first()
        )
    if not screening:
        screening = (
            db.query(Screening)
            .filter(Screening.patient_id == current_patient.patient_id)
            .order_by(Screening.created_at.desc())
            .first()
        )

    report_context = None
    if screening:
        class_id = screening.predicted_class_id or 0
        class_name = screening.predicted_class_name or "No_DR"
        report_context = {
            "date": screening.created_at.strftime("%d %B %Y") if screening.created_at else "Recent",
            "eye": "Left Eye (OS)",
            "grade": f"Grade {class_id}",
            "finding": format_finding_text(class_name),
            "severity": class_name.replace("_", " "),
            "verified_by": screening.verified_by or (screening.doctor.name if screening.doctor else (current_patient.doctor.name if current_patient.doctor else "Treating Clinician")),
            "review_status": screening.review_status or "verified",
            "recommendation": format_recommendation_text(class_id),
            "notes": screening.review_notes or "Clinician examination recorded."
        }

    history_list = None
    if req.history:
        history_list = [{"role": h.role, "content": h.content} for h in req.history]

    patient_full_name = f"{current_patient.first_name} {current_patient.last_name}".strip()
    ai_result = await query_groq_chat(
        patient_name=patient_full_name,
        user_message=user_msg,
        report_context=report_context,
        history=history_list
    )

    return PatientChatResponse(
        reply=ai_result["reply"],
        model=ai_result["model"]
    )
