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

def generate_unique_patient_id(db: Session, prefix: str = "PT") -> str:
    """
    Generates a guaranteed unique Patient ID that does not exist in the database.
    Format: PT-XXXX where XXXX is a non-colliding sequential integer.
    """
    import re
    from sqlalchemy import func

    patients = db.query(Patient.patient_id).filter(Patient.patient_id.isnot(None)).all()
    existing_ids = {p[0].strip().upper() for p in patients if p[0]}

    max_num = 1000
    for pid in existing_ids:
        nums = re.findall(r"\d+", pid)
        for n in nums:
            try:
                val = int(n)
                if 1000 <= val < 999999 and val > max_num:
                    max_num = val
            except ValueError:
                pass

    candidate_num = max_num + 1
    candidate_id = f"{prefix}-{candidate_num}"

    # Verify no collision with existing records
    while candidate_id.upper() in existing_ids or db.query(Patient).filter(func.lower(Patient.patient_id) == candidate_id.lower()).first():
        candidate_num += 1
        candidate_id = f"{prefix}-{candidate_num}"

    return candidate_id

def check_patient_id_available(db: Session, patient_id: str) -> dict:
    from sqlalchemy import func
    clean_id = (patient_id or "").strip()
    if not clean_id:
        return {"patient_id": clean_id, "available": False, "message": "Patient ID cannot be empty."}

    existing = db.query(Patient).filter(
        (Patient.patient_id == clean_id) |
        (func.lower(Patient.patient_id) == clean_id.lower())
    ).first()

    if existing:
        return {
            "patient_id": clean_id,
            "available": False,
            "message": f"Patient ID '{clean_id}' is already assigned to {existing.first_name} {existing.last_name}.",
            "existing_patient": {
                "patient_id": existing.patient_id,
                "name": f"{existing.first_name} {existing.last_name}".strip(),
                "doctor_id": existing.doctor_id
            }
        }
    return {
        "patient_id": clean_id,
        "available": True,
        "message": f"Patient ID '{clean_id}' is available."
    }

def create_patient(db: Session, patient_in: PatientCreate, doctor_id: Optional[str] = None) -> Patient:
    from sqlalchemy import func
    patient_id = (patient_in.patient_id or "").strip()
    if not patient_id:
        patient_id = generate_unique_patient_id(db)
    else:
        existing = db.query(Patient).filter(
            (Patient.patient_id == patient_id) |
            (func.lower(Patient.patient_id) == patient_id.lower())
        ).first()
        if existing:
            raise ValueError(f"Patient ID '{patient_id}' already exists and must be unique to every patient.")

    doc_id = doctor_id or patient_in.doctor_id or "DOC-ANITA"

    db_patient = Patient(
        patient_id=patient_id,
        doctor_id=doc_id,
        first_name=patient_in.first_name.strip(),
        last_name=patient_in.last_name.strip(),
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
    clean_first = first_name.strip()
    clean_last = last_name.strip()
    clean_id = (patient_id or "").strip()

    existing = None
    if clean_id:
        existing = db.query(Patient).filter(
            (Patient.patient_id == clean_id) |
            (func.lower(Patient.patient_id) == clean_id.lower())
        ).first()

    if existing:
        # Check whether this screening is for the same person or someone trying to reuse an existing ID
        existing_first = (existing.first_name or "").strip().lower()
        existing_last = (existing.last_name or "").strip().lower()
        req_first = clean_first.lower()
        req_last = clean_last.lower()

        is_same_person = False
        if req_first and req_first == existing_first:
            is_same_person = True
        elif req_last and req_last == existing_last:
            is_same_person = True
        elif contact_number and existing.contact_number:
            c1 = clean_digits(contact_number)
            c2 = clean_digits(existing.contact_number)
            if len(c1) >= 10 and len(c2) >= 10 and c1[-10:] == c2[-10:]:
                is_same_person = True

        if is_same_person:
            # Same patient returning for subsequent screening
            existing.doctor_id = doc_id
            if clean_first and clean_first != "Patient":
                existing.first_name = clean_first
            if clean_last and clean_last != "Patient":
                existing.last_name = clean_last
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
        else:
            # An existing patient with this ID already exists, but details represent a different person.
            # To ensure NO TWO PATIENTS HAVE THE SAME ID: generate a fresh unique ID for this new patient!
            clean_id = generate_unique_patient_id(db)
            existing = None

    # Check if matching patient exists by phone number
    if not existing and contact_number:
        digits = clean_digits(contact_number)
        if len(digits) >= 10:
            candidates = db.query(Patient).filter(Patient.contact_number.isnot(None)).all()
            for c in candidates:
                c_digits = clean_digits(c.contact_number or "")
                if c_digits and c_digits[-10:] == digits[-10:]:
                    if clean_first.lower() in (c.first_name or "").lower():
                        existing = c
                        break

    if existing:
        existing.doctor_id = doc_id
        if clean_first and clean_first != "Patient":
            existing.first_name = clean_first
        if clean_last and clean_last != "Patient":
            existing.last_name = clean_last
        if clean_age:
            existing.age = clean_age
        if gender:
            existing.gender = gender
        if medical_history:
            existing.medical_history = medical_history
        db.commit()
        db.refresh(existing)
        return existing

    if not clean_id:
        clean_id = generate_unique_patient_id(db)

    # Guarantee uniqueness against DB
    while db.query(Patient).filter(func.lower(Patient.patient_id) == clean_id.lower()).first():
        clean_id = generate_unique_patient_id(db)

    patient_in = PatientCreate(
        patient_id=clean_id,
        doctor_id=doc_id,
        first_name=clean_first,
        last_name=clean_last,
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
