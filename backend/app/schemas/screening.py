from datetime import datetime
from typing import Dict, Optional, Any
from pydantic import BaseModel, Field, ConfigDict
from backend.app.schemas.patient import PatientOut

class ImageInfo(BaseModel):
    filename: str
    original_path: str
    url: Optional[str] = None

class PredictionInfo(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    confidence_percent: float
    class_probabilities: Dict[str, float]

class ExplainabilityInfo(BaseModel):
    method: str = "Grad-CAM"
    target_class: str
    target_layer: str
    heatmap: str
    overlay: str
    heatmap_url: Optional[str] = None
    overlay_url: Optional[str] = None

class AIPredictionOutput(BaseModel):
    status: str = "success"
    dataset: str = "APTOS 2019"
    model: str = "ResNet-18"
    task: str = "5-Class Diabetic Retinopathy Classification"
    image: ImageInfo
    prediction: PredictionInfo
    explainability: ExplainabilityInfo
    generated_at: str

class ScreeningCreate(BaseModel):
    patient_id: str
    media_type: str = "image"

class ScreeningResponse(BaseModel):
    status: str = "success"
    screening_id: str
    patient: Optional[PatientOut] = None
    dataset: str
    model: str
    task: str
    image: ImageInfo
    prediction: PredictionInfo
    explainability: ExplainabilityInfo
    generated_at: str

    model_config = ConfigDict(from_attributes=True)
