from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class AppointmentCreate(BaseModel):
    doctor_id: str
    appointment_date: str
    appointment_time: str
    reason: Optional[str] = None

class AppointmentOut(BaseModel):
    id: int
    appointment_id: str
    patient_id: str
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    patient_phone: Optional[str] = None
    latest_screening_id: Optional[str] = None
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    appointment_date: str
    appointment_time: str
    reason: Optional[str] = None
    status: str = "Confirmed"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
