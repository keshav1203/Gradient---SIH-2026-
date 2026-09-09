import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db_session, get_current_patient, get_current_doctor
from backend.app.models.doctor import Doctor
from backend.app.models.patient import Patient
from backend.app.models.screening import Screening
from backend.app.models.appointment import Appointment
from backend.app.schemas.patient_portal import PatientReportItem, PatientChatRequest, PatientChatResponse
from backend.app.schemas.doctor import DoctorOut
from backend.app.schemas.appointment import AppointmentCreate, AppointmentOut
from backend.app.schemas.screening import ScreeningResponse
from backend.app.services.groq_service import query_groq_chat
from backend.app.services.screening_service import format_screening_response

router = APIRouter(prefix="/patient", tags=["Patient Portal"])
doctor_router = APIRouter(prefix="/doctor", tags=["Doctor Portal"])

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
        history=history_list,
        language=req.language or "en"
    )

    return PatientChatResponse(
        reply=ai_result["reply"],
        model=ai_result["model"]
    )

# --- DOCTOR LIST FOR PATIENT CONSULTATION BOOKING ---
@router.get("/doctors", response_model=List[DoctorOut])
def get_available_doctors(db: Session = Depends(get_db_session)):
    """
    Returns live count and profile details of all doctors stored in the backend database.
    """
    doctors = db.query(Doctor).all()
    return [DoctorOut.model_validate(d) for d in doctors]

# --- PATIENT APPOINTMENT BOOKING ENDPOINTS ---
@router.post("/appointments", response_model=AppointmentOut)
def book_consultation(
    req: AppointmentCreate,
    current_patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db_session)
):
    """
    Books a consultation for the authenticated patient with a selected doctor.
    Stores the booking in backend DB linked to patient_id and doctor_id.
    """
    doctor = db.query(Doctor).filter(Doctor.doctor_id == req.doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with ID '{req.doctor_id}' not found."
        )

    appt_id = f"APT-{current_patient.patient_id.replace('PT-', '')}-{uuid.uuid4().hex[:4].upper()}"
    appointment = Appointment(
        appointment_id=appt_id,
        patient_id=current_patient.patient_id,
        doctor_id=req.doctor_id,
        doctor_name=doctor.name,
        appointment_date=req.appointment_date,
        appointment_time=req.appointment_time,
        reason=req.reason or "Diabetic Retinopathy Consultation",
        status="Confirmed"
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    patient_name = f"{current_patient.first_name} {current_patient.last_name}".strip()
    latest_scr = current_patient.latest_screening_id

    return AppointmentOut(
        id=appointment.id,
        appointment_id=appointment.appointment_id,
        patient_id=current_patient.patient_id,
        patient_name=patient_name,
        patient_age=current_patient.age,
        patient_gender=current_patient.gender,
        patient_phone=current_patient.contact_number,
        latest_screening_id=latest_scr,
        doctor_id=appointment.doctor_id,
        doctor_name=appointment.doctor_name,
        appointment_date=appointment.appointment_date,
        appointment_time=appointment.appointment_time,
        reason=appointment.reason,
        status=appointment.status,
        created_at=appointment.created_at
    )

@router.get("/appointments", response_model=List[AppointmentOut])
def get_patient_appointments(
    current_patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db_session)
):
    appts = db.query(Appointment).filter(Appointment.patient_id == current_patient.patient_id).order_by(Appointment.created_at.desc()).all()
    patient_name = f"{current_patient.first_name} {current_patient.last_name}".strip()
    latest_scr = current_patient.latest_screening_id
    res = []
    for a in appts:
        res.append(AppointmentOut(
            id=a.id,
            appointment_id=a.appointment_id,
            patient_id=a.patient_id,
            patient_name=patient_name,
            patient_age=current_patient.age,
            patient_gender=current_patient.gender,
            patient_phone=current_patient.contact_number,
            latest_screening_id=latest_scr,
            doctor_id=a.doctor_id,
            doctor_name=a.doctor_name,
            appointment_date=a.appointment_date,
            appointment_time=a.appointment_time,
            reason=a.reason,
            status=a.status,
            created_at=a.created_at
        ))
    return res

# --- DOCTOR PORTAL BOOKED CONSULTATIONS ENDPOINT ---
@doctor_router.get("/appointments", response_model=List[AppointmentOut])
def get_doctor_appointments(
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    """
    Returns consultations booked specifically with the authenticated doctor.
    Enforces data isolation (only returns this doctor's appointments).
    """
    appts = db.query(Appointment).filter(Appointment.doctor_id == current_doctor.doctor_id).order_by(Appointment.created_at.desc()).all()
    res = []
    for a in appts:
        pat = db.query(Patient).filter(Patient.patient_id == a.patient_id).first()
        pat_name = f"{pat.first_name} {pat.last_name}".strip() if pat else "Patient"
        pat_age = pat.age if pat else None
        pat_gender = pat.gender if pat else None
        pat_phone = pat.contact_number if pat else None
        latest_scr = pat.latest_screening_id if pat else None

        res.append(AppointmentOut(
            id=a.id,
            appointment_id=a.appointment_id,
            patient_id=a.patient_id,
            patient_name=pat_name,
            patient_age=pat_age,
            patient_gender=pat_gender,
            patient_phone=pat_phone,
            latest_screening_id=latest_scr,
            doctor_id=a.doctor_id,
            doctor_name=a.doctor_name or current_doctor.name,
            appointment_date=a.appointment_date,
            appointment_time=a.appointment_time,
            reason=a.reason,
            status=a.status,
            created_at=a.created_at
        ))
    return res


# --- CONSULTATION: ANY DOCTOR CAN VIEW A REFERRED PATIENT'S SCREENING ---
@doctor_router.get("/consultations/screening/{screening_id}", response_model=ScreeningResponse)
def get_consultation_screening(
    screening_id: str,
    request: Request,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    """
    Read-only access to any screening record for authenticated doctors viewing
    from the Consultations tab. Intentionally bypasses doctor-ownership filter
    so a consulting doctor can see a referred patient's report.
    """
    screening = db.query(Screening).filter(Screening.screening_id == screening_id).first()
    if not screening:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Screening record '{screening_id}' not found."
        )
    return format_screening_response(screening, base_url=str(request.base_url))
