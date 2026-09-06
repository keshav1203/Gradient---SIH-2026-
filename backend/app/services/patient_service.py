import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.patient import Patient
from backend.app.schemas.patient import PatientCreate, PatientUpdate

def get_patient_by_id(db: Session, patient_id: str, doctor_id: Optional[str] = None) -> Optional[Patient]:
    query = db.query(Patient).filter(Patient.patient_id == patient_id)
    if doctor_id:
        query = query.filter(Patient.doctor_id == doctor_id)
    return query.first()

def get_patient_by_pk(db: Session, id: int, doctor_id: Optional[str] = None) -> Optional[Patient]:
    query = db.query(Patient).filter(Patient.id == id)
    if doctor_id:
        query = query.filter(Patient.doctor_id == doctor_id)
    return query.first()

def create_patient(db: Session, patient_in: PatientCreate, doctor_id: Optional[str] = None) -> Patient:
    patient_id = patient_in.patient_id
    if not patient_id:
        patient_id = f"PAT-{uuid.uuid4().hex[:6].upper()}"

    doc_id = doctor_id or patient_in.doctor_id or "DOC-ANITA"

    db_patient = Patient(
        patient_id=patient_id,
        doctor_id=doc_id,
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

def clean_digits(val: Optional[str]) -> str:
    import re
    return re.sub(r"\D", "", val or "")

def get_or_create_patient(
    db: Session, 
    patient_id: Optional[str],
    first_name: str,
    last_name: str,
    age: int,
    gender: str,
    contact_number: Optional[str] = None,
    medical_history: Optional[str] = None,
    doctor_id: Optional[str] = None
) -> Patient:
    from sqlalchemy import func
    clean_age = sanitize_age(age)
    doc_id = doctor_id or "DOC-ANITA"

    existing = None
    if patient_id:
        existing = db.query(Patient).filter(
            (Patient.patient_id == patient_id) |
            (func.lower(Patient.patient_id) == patient_id.lower())
        ).first()

    if not existing and contact_number:
        digits = clean_digits(contact_number)
        if len(digits) >= 10:
            candidates = db.query(Patient).filter(Patient.contact_number.isnot(None)).all()
            for c in candidates:
                c_digits = clean_digits(c.contact_number or "")
                if c_digits and c_digits[-10:] == digits[-10:]:
                    existing = c
                    break

    if existing:
        # Re-assign or ensure patient is stored under THIS doctor who is screening them
        existing.doctor_id = doc_id
        if first_name and first_name != "Patient":
            existing.first_name = first_name
        if last_name and last_name != "Patient":
            existing.last_name = last_name
        if clean_age:
            existing.age = clean_age
        if gender:
            existing.gender = gender
        if contact_number:
            existing.contact_number = contact_number
        if medical_history:
            existing.medical_history = medical_history
        db.commit()
        db.refresh(existing)
        return existing

    patient_in = PatientCreate(
        patient_id=patient_id,
        doctor_id=doc_id,
        first_name=first_name,
        last_name=last_name,
        age=clean_age,
        gender=gender,
        contact_number=contact_number,
        medical_history=medical_history
    )
    return create_patient(db, patient_in, doctor_id=doc_id)

def list_patients(db: Session, doctor_id: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Patient]:
    query = db.query(Patient)
    if doctor_id:
        query = query.filter(Patient.doctor_id == doctor_id)
    return query.offset(skip).limit(limit).all()

def delete_patient(db: Session, patient_id: str, doctor_id: Optional[str] = None) -> bool:
    patient = get_patient_by_id(db, patient_id, doctor_id=doctor_id)
    if not patient:
        return False
    db.delete(patient)
    db.commit()
    return True
