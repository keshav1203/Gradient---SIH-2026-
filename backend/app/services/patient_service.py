import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.patient import Patient
from backend.app.schemas.patient import PatientCreate, PatientUpdate

def get_patient_by_id(db: Session, patient_id: str) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.patient_id == patient_id).first()

def get_patient_by_pk(db: Session, id: int) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.id == id).first()

def create_patient(db: Session, patient_in: PatientCreate) -> Patient:
    patient_id = patient_in.patient_id
    if not patient_id:
        patient_id = f"PAT-{uuid.uuid4().hex[:6].upper()}"

    db_patient = Patient(
        patient_id=patient_id,
        first_name=patient_in.first_name,
        last_name=patient_in.last_name,
        age=patient_in.age,
        gender=patient_in.gender,
        contact_number=patient_in.contact_number,
        medical_history=patient_in.medical_history
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

def sanitize_age(age: int) -> int:
    try:
        from datetime import datetime
        current_year = datetime.now().year
        if 1900 <= age <= current_year:
            age = current_year - age
        return min(120, max(1, age))
    except Exception:
        return 50

def get_or_create_patient(
    db: Session, 
    patient_id: Optional[str],
    first_name: str,
    last_name: str,
    age: int,
    gender: str,
    contact_number: Optional[str] = None,
    medical_history: Optional[str] = None
) -> Patient:
    clean_age = sanitize_age(age)
    if patient_id:
        existing = get_patient_by_id(db, patient_id)
        if existing:
            return existing

    patient_in = PatientCreate(
        patient_id=patient_id,
        first_name=first_name,
        last_name=last_name,
        age=clean_age,
        gender=gender,
        contact_number=contact_number,
        medical_history=medical_history
    )
    return create_patient(db, patient_in)

def list_patients(db: Session, skip: int = 0, limit: int = 100) -> List[Patient]:
    return db.query(Patient).offset(skip).limit(limit).all()

def delete_patient(db: Session, patient_id: str) -> bool:
    patient = get_patient_by_id(db, patient_id)
    if not patient:
        return False
    db.delete(patient)
    db.commit()
    return True

