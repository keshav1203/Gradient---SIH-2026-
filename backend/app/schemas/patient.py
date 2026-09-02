from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class PatientBase(BaseModel):
    first_name: str = Field(..., json_schema_extra={"example": "John"})
    last_name: str = Field(..., json_schema_extra={"example": "Doe"})
    age: int = Field(..., ge=0, le=130, json_schema_extra={"example": 54})
    gender: str = Field(..., json_schema_extra={"example": "Male"})
    contact_number: Optional[str] = Field(None, json_schema_extra={"example": "+91 9876543210"})
    medical_history: Optional[str] = Field(None, json_schema_extra={"example": "Type 2 Diabetes for 8 years"})

class PatientCreate(PatientBase):
    patient_id: Optional[str] = Field(None, json_schema_extra={"example": "PAT-1001"})

class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    medical_history: Optional[str] = None

class PatientOut(PatientBase):
    id: int
    patient_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
