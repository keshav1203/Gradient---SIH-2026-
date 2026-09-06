from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class PatientReportItem(BaseModel):
    id: str
    screening_id: str
    patient_id: str
    patient_name: str
    date: str
    eye: str
    original_image_url: str
    finding: str
    severity: str
    review_status: str
    verified_by: Optional[str] = None
    recommendation: Optional[str] = None
    notes: Optional[str] = None

class PatientChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str

class PatientChatRequest(BaseModel):
    message: str
    history: Optional[List[PatientChatMessage]] = None
    screening_id: Optional[str] = None

class PatientChatResponse(BaseModel):
    reply: str
    model: str = "Groq LLM"
    disclaimer: str = "This explanation is for educational purposes and is not a medical prescription or diagnostic override. Please consult your treating ophthalmologist for clinical decisions."
