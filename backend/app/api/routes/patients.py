from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db_session, get_current_doctor
from backend.app.models.doctor import Doctor
from backend.app.models.patient import Patient
from backend.app.schemas.patient import PatientCreate, PatientOut, PatientUpdate
from backend.app.services.patient_service import (
    create_patient, get_patient_by_id, list_patients, delete_patient,
    generate_unique_patient_id, check_patient_id_available
)

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.get("/generate-id", response_model=dict)
def get_unique_patient_id(
    prefix: str = "PT",
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    """Generates a guaranteed unique Patient ID that does not exist in the database."""
    unique_id = generate_unique_patient_id(db, prefix=prefix)
    return {"patient_id": unique_id}

@router.get("/check-id/{patient_id}", response_model=dict)
def check_id_availability(
    patient_id: str,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    """Checks whether a patient ID is already assigned to an existing patient."""
    return check_patient_id_available(db, patient_id)

@router.post("/", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_new_patient(
    patient_in: PatientCreate,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    pid = (patient_in.patient_id or "").strip()
    if pid:
        existing = db.query(Patient).filter(
            (Patient.patient_id == pid) |
            (func.lower(Patient.patient_id) == pid.lower())
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Patient ID '{pid}' is already assigned to {existing.first_name} {existing.last_name}. Every patient must have a unique Patient ID."
            )
    try:
        return create_patient(db, patient_in, doctor_id=current_doctor.doctor_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )

@router.get("/", response_model=List[PatientOut])
def read_patients(
    skip: int = 0,
    limit: int = 100,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    return list_patients(db, doctor_id=current_doctor.doctor_id, skip=skip, limit=limit)

@router.get("/{patient_id}", response_model=PatientOut)
def read_patient(
    patient_id: str,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    patient = get_patient_by_id(db, patient_id, doctor_id=current_doctor.doctor_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found."
        )
    return patient

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_patient(
    patient_id: str,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    success = delete_patient(db, patient_id, doctor_id=current_doctor.doctor_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found."
        )
    return None
