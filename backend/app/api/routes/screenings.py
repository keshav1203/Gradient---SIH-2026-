from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, Request, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db_session
from backend.app.schemas.screening import ScreeningResponse
from backend.app.services.screening_service import (
    process_screening_submission, get_screening_by_id, get_screenings_by_patient_id
)

router = APIRouter(prefix="/screenings", tags=["Screenings"])

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

@router.get("/{screening_id}")
def read_screening(screening_id: str, db: Session = Depends(get_db_session)):
    screening = get_screening_by_id(db, screening_id)
    if not screening:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Screening record '{screening_id}' not found."
        )
    return screening

@router.get("/patient/{patient_id}")
def read_patient_screenings(patient_id: str, db: Session = Depends(get_db_session)):
    screenings = get_screenings_by_patient_id(db, patient_id)
    return screenings
