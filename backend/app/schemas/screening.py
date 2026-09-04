from datetime import datetime
from typing import Dict, Optional, Any, List
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
    enhanced: Optional[str] = None
    heatmap_url: Optional[str] = None
    overlay_url: Optional[str] = None
    enhanced_url: Optional[str] = None
    dynamic_opacity: Optional[float] = None
    retina_masked: Optional[bool] = True
    detected_lesions: Optional[List[Dict[str, Any]]] = None

    model_config = ConfigDict(extra="ignore")

class QualityAssessmentInfo(BaseModel):
    status: str = "assessed"
    overall_score: int = 90
    decision: str = "Good"
    blur_score: int = 85
    illumination_score: int = 90
    contrast_score: int = 88
    fov_score: int = 92
    is_acceptable: bool = True
    mean_intensity: Optional[float] = None
    illum_uniformity: Optional[float] = None
    rms_contrast: Optional[float] = None
    fov_ratio: Optional[float] = None
    error: Optional[str] = None
    rejection_reasons: Optional[List[str]] = None
    recommendation: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

class QualityAssessmentResponse(BaseModel):
    status: str = "success"  # success, rejected, error
    quality_assessment: Optional[QualityAssessmentInfo] = None
    rejection_reason: Optional[str] = None
    rejection_reasons: Optional[List[str]] = None
    recommendation: Optional[str] = None
    error: Optional[str] = None
    detail: Optional[str] = None
    image_url: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

class ClinicianReviewIn(BaseModel):
    notes: Optional[str] = None
    status: str = "verified" # verified, review_required, pending
    verified_by: Optional[str] = "Dr. Anita"

class ClinicianReviewOut(BaseModel):
    verified: bool = False
    verified_by: Optional[str] = None
    doctor_hospital: Optional[str] = "District Hospital"
    date: Optional[str] = None
    notes: Optional[str] = None
    status: str = "pending"

class DashboardMetricsOut(BaseModel):
    total_patients: str
    todays_screenings: int
    todays_screenings_delta: str
    pending_reviews: int
    low_confidence_cases: int
    low_confidence_note: str

class AIPredictionOutput(BaseModel):
    status: str = "success"
    dataset: str = "APTOS 2019"
    model: str = "ResNet-18"
    task: str = "5-Class Diabetic Retinopathy Classification"
    image: ImageInfo
    prediction: PredictionInfo
    explainability: ExplainabilityInfo
    quality_assessment: Optional[QualityAssessmentInfo] = None
    generated_at: str

class ScreeningCreate(BaseModel):
    patient_id: str
    media_type: str = "image"

class ScreeningResponse(BaseModel):
    status: str = "success"  # success, rejected, error
    screening_id: str
    patient_id: Optional[str] = None
    patient: Optional[PatientOut] = None
    dataset: str
    model: str
    task: str
    image: ImageInfo
    prediction: Optional[PredictionInfo] = None
    explainability: Optional[ExplainabilityInfo] = None
    quality_assessment: Optional[QualityAssessmentInfo] = None
    rejection_reason: Optional[str] = None
    recommendation: Optional[str] = None
    error: Optional[str] = None
    review: Optional[ClinicianReviewOut] = None
    created_at: Optional[datetime] = None
    generated_at: str

    model_config = ConfigDict(from_attributes=True)
