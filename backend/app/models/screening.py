from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Screening(Base):
    __tablename__ = "screenings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    screening_id = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(String(50), ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False)
    
    media_type = Column(String(20), nullable=False, default="image") # image or video
    original_filename = Column(String(255), nullable=False)
    original_media_path = Column(String(500), nullable=False)
    
    status = Column(String(50), nullable=False, default="success")
    dataset = Column(String(100), nullable=False, default="APTOS 2019")
    model_name = Column(String(100), nullable=False, default="ResNet-18")
    task = Column(String(200), nullable=False, default="5-Class Diabetic Retinopathy Classification")
    
    predicted_class_id = Column(Integer, nullable=False)
    predicted_class_name = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    confidence_percent = Column(Float, nullable=False)
    class_probabilities = Column(JSON, nullable=False)
    
    explainability_method = Column(String(50), nullable=False, default="Grad-CAM")
    target_class = Column(String(50), nullable=False)
    target_layer = Column(String(100), nullable=False)
    heatmap_path = Column(String(500), nullable=False)
    overlay_path = Column(String(500), nullable=False)

    review_status = Column(String(50), nullable=False, default="pending") # verified, pending, review_required
    review_notes = Column(String(1000), nullable=True)
    verified_by = Column(String(100), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    
    raw_ai_output = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="screenings")
