from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db_session
from backend.app.schemas.patient import PatientCreate, PatientOut, PatientUpdate
from backend.app.services.patient_service import (
    create_patient, get_patient_by_id, list_patients
)

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.post("/", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_new_patient(patient_in: PatientCreate, db: Session = Depends(get_db_session)):
    if patient_in.patient_id:
        existing = get_patient_by_id(db, patient_in.patient_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patient with ID '{patient_in.patient_id}' already exists."
            )
    return create_patient(db, patient_in)

@router.get("/", response_model=List[PatientOut])
def read_patients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db_session)):
    return list_patients(db, skip=skip, limit=limit)

@router.get("/{patient_id}", response_model=PatientOut)
def read_patient(patient_id: str, db: Session = Depends(get_db_session)):
    patient = get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found."
        )
    return patient
