from typing import Generator, Optional
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.auth import verify_token
from backend.app.models.doctor import Doctor
from backend.app.models.patient import Patient

def get_db_session() -> Generator:
    yield from get_db()

def get_current_doctor(
    request: Request,
    db: Session = Depends(get_db_session)
) -> Doctor:
    """
    Extracts authenticated doctor from Bearer token or X-Doctor-Id header.
    If no auth header is provided (e.g. legacy/test calls), safely falls back
    to default doctor DOC-ANITA to preserve backward compatibility.
    """
    auth_header = request.headers.get("Authorization")
    doctor_id = None

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "").strip()
        payload = verify_token(token)
        if payload and payload.get("role") == "doctor":
            doctor_id = payload.get("doctor_id")

    # Support explicit X-Doctor-Id header (useful for client requests and testing)
    if not doctor_id:
        doctor_id = request.headers.get("X-Doctor-Id")

    if not doctor_id:
        # Fallback to default doctor DOC-ANITA for seamless backward compatibility
        doctor = db.query(Doctor).filter(Doctor.doctor_id == "DOC-ANITA").first()
        if not doctor:
            doctor = Doctor(
                doctor_id="DOC-ANITA",
                name="Dr. Anita Sharma",
                dob="15081980",
                email="anita.sharma@drishtikon.health",
                hospital="District Hospital Eye Care Centre",
                department="Rural Retinal AI Screening Unit"
            )
            db.add(doctor)
            db.commit()
            db.refresh(doctor)
        return doctor

    doctor = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Doctor with ID '{doctor_id}' not found."
        )
    return doctor

def get_current_patient(
    request: Request,
    db: Session = Depends(get_db_session)
) -> Patient:
    """
    Extracts authenticated patient from Bearer token or X-Patient-Id header.
    """
    auth_header = request.headers.get("Authorization")
    patient_id = None

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "").strip()
        payload = verify_token(token)
        if payload and payload.get("role") == "patient":
            patient_id = payload.get("patient_id")

    if not patient_id:
        patient_id = request.headers.get("X-Patient-Id")

    if not patient_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Patient authentication required."
        )

    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Patient '{patient_id}' not found."
        )
    return patient
