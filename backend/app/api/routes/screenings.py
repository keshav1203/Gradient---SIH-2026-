import re
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, Request, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db_session, get_current_doctor
from backend.app.models.doctor import Doctor
from backend.app.schemas.screening import ScreeningResponse, ClinicianReviewIn, DashboardMetricsOut, QualityAssessmentResponse
from backend.app.services.patient_service import get_patient_by_id
from backend.app.services.screening_service import (
    process_screening_submission,
    assess_quality_submission,
    get_screening_by_id,
    get_screenings_by_patient_id,
    list_screenings,
    update_screening_review,
    get_screening_metrics,
    format_screening_response
)

router = APIRouter(prefix="/screenings", tags=["Screenings"])

@router.get("/metrics/stats", response_model=DashboardMetricsOut)
def read_screening_metrics(
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    return get_screening_metrics(db, doctor_id=current_doctor.doctor_id)

@router.get("/", response_model=List[ScreeningResponse])
def read_all_screenings(
    request: Request,
    skip: int = 0,
    limit: int = 50,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    base_url = str(request.base_url)
    screenings = list_screenings(db, doctor_id=current_doctor.doctor_id, skip=skip, limit=limit)
    return [format_screening_response(s, base_url=base_url) for s in screenings]

@router.post("/assess-quality", response_model=QualityAssessmentResponse)
async def assess_quality(
    request: Request,
    file: UploadFile = File(..., description="Fundus image (.png, .jpg, .jpeg) or video (.mp4, .avi)")
):
    """
    Quality-only endpoint: Runs standalone MATLAB quality assessment (blur, illumination, contrast, FOV)
    and returns a gradability verdict (Good/Poor + reasons) WITHOUT running classify() or Grad-CAM.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename."
        )

    base_url = str(request.base_url)

    try:
        response = await assess_quality_submission(file=file, base_url=base_url)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Quality assessment failed: {str(e)}"
        )

@router.post("/process", response_model=ScreeningResponse, status_code=status.HTTP_201_CREATED)
async def process_screening(
    request: Request,
    file: UploadFile = File(..., description="Fundus image (.png, .jpg, .jpeg) or video (.mp4, .avi)"),
    first_name: str = Form(..., description="Patient First Name"),
    last_name: str = Form(..., description="Patient Last Name"),
    age: int = Form(..., description="Patient Age"),
    gender: str = Form(..., description="Patient Gender (Male/Female/Other)"),
    patient_id: Optional[str] = Form(None, description="Optional Existing Patient ID (e.g. PAT-1001)"),
    contact_number: Optional[str] = Form(None, description="Patient Contact Number (Required for Patient Login)"),
    medical_history: Optional[str] = Form(None, description="Optional Medical History Notes"),
    doctor_id: Optional[str] = Form(None, description="Optional Doctor ID from client"),
    doctor_name: Optional[str] = Form(None, description="Optional Doctor Name from client"),
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    """
    Receives Patient Info + Fundus Image or Video file.
    1. Validates mandatory contact number (Point 2).
    2. Stores/updates Patient info linked to logged-in doctor.
    3. Runs MATLAB DR Model + Grad-CAM Explainability.
    4. Saves screening prediction and raw AI output JSON in DB linked to logged-in doctor.
    5. Returns JSON response matching MATLAB AI output structure + media URLs to Frontend.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename."
        )

    # Point 2: Mandatory phone number validation
    if not contact_number or not contact_number.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is mandatory for new screenings and patient portal access."
        )

    clean_phone_digits = re.sub(r"\D", "", contact_number)
    if len(clean_phone_digits) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid phone number with at least 10 digits."
        )

    base_url = str(request.base_url)

    # Resolve active doctor performing this screening
    effective_doctor_id = (doctor_id or "").strip()
    if not effective_doctor_id and current_doctor:
        effective_doctor_id = current_doctor.doctor_id

    from sqlalchemy import func
    active_doctor = None
    if effective_doctor_id:
        norm_id = effective_doctor_id.lower().replace("dr.", "").replace("dr ", "").strip()
        active_doctor = db.query(Doctor).filter(
            (Doctor.doctor_id == effective_doctor_id) |
            (func.lower(Doctor.doctor_id) == effective_doctor_id.lower()) |
            (func.lower(Doctor.doctor_id) == f"doc-{norm_id}") |
            (func.lower(Doctor.name) == effective_doctor_id.lower())
        ).first()

    if not active_doctor and doctor_name:
        norm_name = doctor_name.lower().replace("dr.", "").replace("dr ", "").strip()
        active_doctor = db.query(Doctor).filter(
            (func.lower(Doctor.name).contains(norm_name)) |
            (func.lower(Doctor.doctor_id).contains(norm_name))
        ).first()

    if not active_doctor:
        active_doctor = current_doctor

    doc_id = active_doctor.doctor_id if active_doctor else "DOC-ANITA"
    doc_name = active_doctor.name if active_doctor else (doctor_name or "Dr. Anita Sharma")

    try:
        response = await process_screening_submission(
            db=db,
            file=file,
            first_name=first_name,
            last_name=last_name,
            age=age,
            gender=gender,
            patient_id=patient_id,
            contact_number=contact_number.strip(),
            medical_history=medical_history,
            base_url=base_url,
            doctor_id=doc_id,
            doctor_name=doc_name
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Screening processing failed: {str(e)}"
        )

@router.patch("/{screening_id}/review", response_model=ScreeningResponse)
def submit_review(
    screening_id: str,
    review_in: ClinicianReviewIn,
    request: Request,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    reviewer_name = current_doctor.name if (current_doctor and current_doctor.name) else (review_in.verified_by or "Treating Clinician")
    if review_in.verified_by and review_in.verified_by not in ("Dr. Anita", "Dr. Anita Sharma", "Treating Clinician"):
        reviewer_name = review_in.verified_by

    updated = update_screening_review(
        db=db,
        screening_id=screening_id,
        notes=review_in.notes,
        status=review_in.status,
        verified_by=reviewer_name,
        doctor_id=current_doctor.doctor_id
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Screening record '{screening_id}' not found."
        )
    return format_screening_response(updated, base_url=str(request.base_url))

@router.get("/{screening_id}", response_model=ScreeningResponse)
def read_screening(
    screening_id: str,
    request: Request,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    screening = get_screening_by_id(db, screening_id, doctor_id=current_doctor.doctor_id)
    if not screening:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Screening record '{screening_id}' not found."
        )
    return format_screening_response(screening, base_url=str(request.base_url))

@router.get("/patient/{patient_id}", response_model=List[ScreeningResponse])
def read_patient_screenings(
    patient_id: str,
    request: Request,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    # Verify patient ownership first for data isolation
    patient = get_patient_by_id(db, patient_id, doctor_id=current_doctor.doctor_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found."
        )
    screenings = get_screenings_by_patient_id(db, patient_id, doctor_id=current_doctor.doctor_id)
    return [format_screening_response(s, base_url=str(request.base_url)) for s in screenings]
