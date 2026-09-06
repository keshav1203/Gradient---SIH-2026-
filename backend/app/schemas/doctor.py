from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class DoctorBase(BaseModel):
    doctor_id: str
    name: str
    hospital: Optional[str] = "District Hospital Eye Care Centre"
    department: Optional[str] = "Rural Retinal AI Screening Unit"

class DoctorOut(DoctorBase):
    id: int
    dob: str
    email: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
