import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db_session
from backend.app.core.auth import create_access_token
from backend.app.models.doctor import Doctor
from backend.app.models.patient import Patient
from backend.app.schemas.auth import DoctorLoginRequest, PatientLoginRequest, AuthResponse
from backend.app.schemas.doctor import DoctorOut
from backend.app.schemas.patient import PatientOut

router = APIRouter(prefix="/auth", tags=["Authentication"])

def clean_digits(val: str) -> str:
    return re.sub(r"\D", "", val or "")

def normalize_dob(dob_str: str) -> str:
    """Returns clean 8-digit DDMMYYYY string."""
    digits = clean_digits(dob_str)
    # If YYYYMMDD (starts with 19 or 20 and len == 8), convert to DDMMYYYY
    if len(digits) == 8 and (digits.startswith("19") or digits.startswith("20")):
        return f"{digits[6:8]}{digits[4:6]}{digits[0:4]}"
    return digits

@router.post("/doctor/login", response_model=AuthResponse)
def doctor_login(req: DoctorLoginRequest, db: Session = Depends(get_db_session)):
    doc_id = (req.doctor_id or "").strip()
    password = (req.password or "").strip()

    if not doc_id or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doctor ID and password (Date of Birth) are required."
        )

    from sqlalchemy import func
    normalized_doc_id = doc_id.lower().replace("dr.", "").replace("dr ", "").strip()
    doctor = db.query(Doctor).filter(
        (Doctor.doctor_id == doc_id) |
        (func.lower(Doctor.doctor_id) == doc_id.lower()) |
        (func.lower(Doctor.doctor_id) == f"doc-{normalized_doc_id}") |
        (func.lower(Doctor.name) == doc_id.lower())
    ).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Doctor ID or password."
        )

    # Verify password against Doctor Date of Birth (DDMMYYYY)
    clean_input_pass = normalize_dob(password)
    clean_doctor_dob = normalize_dob(doctor.dob)

    if clean_input_pass != clean_doctor_dob:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Doctor ID or password (Password must be your Date of Birth in DDMMYYYY format)."
        )

    token = create_access_token({"role": "doctor", "doctor_id": doctor.doctor_id, "name": doctor.name})

    return AuthResponse(
        status="success",
        role="doctor",
        token=token,
        doctor=DoctorOut.model_validate(doctor),
        message=f"Welcome, {doctor.name}"
    )

@router.post("/patient/login", response_model=AuthResponse)
def patient_login(req: PatientLoginRequest, db: Session = Depends(get_db_session)):
    identifier = (req.identifier or "").strip()
    pat_id = (req.patient_id or "").strip()
    phone = (req.phone_number or "").strip()

    raw_query = identifier or pat_id or phone
    if not raw_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient ID or registered phone number is required."
        )

    patient = None

    # Legacy two-field validation if both patient_id and phone were explicitly provided without identifier
    if pat_id and phone and not identifier:
        patient = db.query(Patient).filter(
            (Patient.patient_id == pat_id) |
            (func.lower(Patient.patient_id) == pat_id.lower())
        ).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Patient not found with this ID."
            )

        input_digits = clean_digits(phone)
        patient_digits = clean_digits(patient.contact_number or "")

        if not (input_digits and patient_digits and (input_digits[-10:] == patient_digits[-10:])):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Phone number does not match records for this Patient ID."
            )
    else:
        # Single field lookup: raw_query may be Patient ID or Phone Number
        # 1. First attempt to match by Patient ID
        patient = db.query(Patient).filter(
            (Patient.patient_id == raw_query) |
            (func.lower(Patient.patient_id) == raw_query.lower()) |
            (func.lower(Patient.patient_id) == f"pt-{raw_query.lower()}")
        ).first()

        # 2. If not found by ID, attempt to match by phone number
        if not patient:
            digits = clean_digits(raw_query)
            if len(digits) >= 4:
                candidates = db.query(Patient).filter(Patient.contact_number.isnot(None)).all()
                for c in candidates:
                    c_digits = clean_digits(c.contact_number or "")
                    if len(digits) >= 10 and len(c_digits) >= 10:
                        if c_digits[-10:] == digits[-10:]:
                            patient = c
                            break
                    elif c_digits == digits or (len(digits) >= 7 and digits in c_digits):
                        patient = c
                        break

        if not patient:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No patient record found matching that Patient ID or Phone Number."
            )

    token = create_access_token({"role": "patient", "patient_id": patient.patient_id, "name": f"{patient.first_name} {patient.last_name}".strip()})

    return AuthResponse(
        status="success",
        role="patient",
        token=token,
        patient=PatientOut.model_validate(patient),
        message=f"Welcome, {patient.first_name} {patient.last_name}".strip()
    )
