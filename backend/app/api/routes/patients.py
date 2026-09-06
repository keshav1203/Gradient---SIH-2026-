from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db_session, get_current_doctor
from backend.app.models.doctor import Doctor
from backend.app.models.patient import Patient
from backend.app.schemas.patient import PatientCreate, PatientOut, PatientUpdate
from backend.app.services.patient_service import (
    create_patient, get_patient_by_id, list_patients, delete_patient
)

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.post("/", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_new_patient(
    patient_in: PatientCreate,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db_session)
):
    if patient_in.patient_id:
        existing = db.query(Patient).filter(
            (Patient.patient_id == patient_in.patient_id) |
            (func.lower(Patient.patient_id) == patient_in.patient_id.lower())
        ).first()
        if existing:
            existing.doctor_id = current_doctor.doctor_id
            existing.first_name = patient_in.first_name
            existing.last_name = patient_in.last_name
            existing.age = patient_in.age
            existing.gender = patient_in.gender
            if patient_in.contact_number:
                existing.contact_number = patient_in.contact_number
            if patient_in.medical_history:
                existing.medical_history = patient_in.medical_history
            db.commit()
            db.refresh(existing)
            return existing
    return create_patient(db, patient_in, doctor_id=current_doctor.doctor_id)

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
