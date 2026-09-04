from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, Request, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db_session
from backend.app.schemas.screening import ScreeningResponse, ClinicianReviewIn, DashboardMetricsOut, QualityAssessmentResponse
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
def read_screening_metrics(db: Session = Depends(get_db_session)):
    return get_screening_metrics(db)

@router.get("/", response_model=List[ScreeningResponse])
def read_all_screenings(
    request: Request,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db_session)
):
    base_url = str(request.base_url)
    screenings = list_screenings(db, skip=skip, limit=limit)
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
    contact_number: Optional[str] = Form(None, description="Optional Contact Number"),
    medical_history: Optional[str] = Form(None, description="Optional Medical History Notes"),
    db: Session = Depends(get_db_session)
):
    """
    Receives Patient Info + Fundus Image or Video file.
    1. Stores/updates Patient info in PostgreSQL DB.
    2. Runs MATLAB DR Model + Grad-CAM Explainability.
    3. Saves screening prediction and raw AI output JSON in PostgreSQL DB.
    4. Returns JSON response matching MATLAB AI output structure + media URLs to Frontend.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename."
        )

    base_url = str(request.base_url)

    try:
        response = await process_screening_submission(
            db=db,
            file=file,
            first_name=first_name,
            last_name=last_name,
            age=age,
            gender=gender,
            patient_id=patient_id,
            contact_number=contact_number,
            medical_history=medical_history,
            base_url=base_url
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
    db: Session = Depends(get_db_session)
):
    updated = update_screening_review(
        db=db,
        screening_id=screening_id,
        notes=review_in.notes,
        status=review_in.status,
        verified_by=review_in.verified_by
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Screening record '{screening_id}' not found."
        )
    return format_screening_response(updated, base_url=str(request.base_url))

@router.get("/{screening_id}", response_model=ScreeningResponse)
def read_screening(screening_id: str, request: Request, db: Session = Depends(get_db_session)):
    screening = get_screening_by_id(db, screening_id)
    if not screening:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Screening record '{screening_id}' not found."
        )
    return format_screening_response(screening, base_url=str(request.base_url))

@router.get("/patient/{patient_id}", response_model=List[ScreeningResponse])
def read_patient_screenings(patient_id: str, request: Request, db: Session = Depends(get_db_session)):
    screenings = get_screenings_by_patient_id(db, patient_id)
    return [format_screening_response(s, base_url=str(request.base_url)) for s in screenings]

