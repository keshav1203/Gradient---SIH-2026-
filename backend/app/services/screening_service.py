import uuid
import logging
from pathlib import Path
from typing import List, Optional, Tuple
from fastapi import UploadFile
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.patient import Patient
from backend.app.models.screening import Screening
from backend.app.schemas.patient import PatientOut
from backend.app.schemas.screening import (
    ScreeningResponse, ImageInfo, PredictionInfo, ExplainabilityInfo, AIPredictionOutput
)
from backend.app.services.patient_service import get_or_create_patient
from backend.app.services.matlab_service import matlab_service
from backend.app.utils.storage import save_upload_file
from backend.app.utils.media_processor import is_video_file, process_media_file

logger = logging.getLogger(__name__)

async def process_screening_submission(
    db: Session,
    file: UploadFile,
    first_name: str,
    last_name: str,
    age: int,
    gender: str,
    patient_id: Optional[str] = None,
    contact_number: Optional[str] = None,
    medical_history: Optional[str] = None,
    base_url: str = ""
) -> ScreeningResponse:
    """
    Main workflow:
    1. Stores/updates patient record in PostgreSQL
    2. Saves uploaded image/video file to storage
    3. If video, extracts keyframe image
    4. Runs MATLAB AI model inference (or fallback engine)
    5. Saves screening result into PostgreSQL DB
    6. Formats response with prediction JSON and accessible static image URLs
    """
    # 1. Store or retrieve Patient in DB
    patient = get_or_create_patient(
        db=db,
        patient_id=patient_id,
        first_name=first_name,
        last_name=last_name,
        age=age,
        gender=gender,
        contact_number=contact_number,
        medical_history=medical_history
    )

    # 2. Save file
    uploaded_file_path = await save_upload_file(file, settings.UPLOAD_DIR)
    media_type = "video" if is_video_file(uploaded_file_path) else "image"

    # 3. Process video keyframe if video
    inference_image_path = process_media_file(uploaded_file_path, settings.UPLOAD_DIR)

    # 4. Run MATLAB AI Inference
    ai_raw_output = matlab_service.run_inference(inference_image_path)

    # 5. Extract prediction components
    prediction = ai_raw_output.get("prediction", {})
    explainability = ai_raw_output.get("explainability", {})
    image_info = ai_raw_output.get("image", {})

    screening_id = f"SCR-{uuid.uuid4().hex[:8].upper()}"

    heatmap_path = explainability.get("heatmap", "")
    overlay_path = explainability.get("overlay", "")

    # 6. Store Screening record in PostgreSQL DB
    db_screening = Screening(
        screening_id=screening_id,
        patient_id=patient.patient_id,
        media_type=media_type,
        original_filename=file.filename or uploaded_file_path.name,
        original_media_path=str(uploaded_file_path.resolve()),
        status=ai_raw_output.get("status", "success"),
        dataset=ai_raw_output.get("dataset", "APTOS 2019"),
        model_name=ai_raw_output.get("model", "ResNet-18"),
        task=ai_raw_output.get("task", "5-Class Diabetic Retinopathy Classification"),
        predicted_class_id=prediction.get("class_id", 0),
        predicted_class_name=prediction.get("class_name", "No_DR"),
        confidence=prediction.get("confidence", 0.0),
        confidence_percent=prediction.get("confidence_percent", 0.0),
        class_probabilities=prediction.get("class_probabilities", {}),
        explainability_method=explainability.get("method", "Grad-CAM"),
        target_class=explainability.get("target_class", "No_DR"),
        target_layer=explainability.get("target_layer", "res5b_branch2b"),
        heatmap_path=str(heatmap_path),
        overlay_path=str(overlay_path),
        raw_ai_output=ai_raw_output
    )

    db.add(db_screening)
    db.commit()
    db.refresh(db_screening)

    # 7. Generate URLs for static assets
    clean_base = base_url.rstrip("/")
    image_url = f"{clean_base}/static/uploads/{uploaded_file_path.name}"
    heatmap_name = Path(heatmap_path).name if heatmap_path else ""
    overlay_name = Path(overlay_path).name if overlay_path else ""

    heatmap_url = f"{clean_base}/static/reports/{heatmap_name}" if heatmap_name else None
    overlay_url = f"{clean_base}/static/reports/{overlay_name}" if overlay_name else None

    # Construct response matching JSON format + URLs
    formatted_image = ImageInfo(
        filename=image_info.get("filename", uploaded_file_path.name),
        original_path=image_info.get("original_path", str(uploaded_file_path.resolve())),
        url=image_url
    )

    formatted_prediction = PredictionInfo(
        class_id=prediction.get("class_id", 0),
        class_name=prediction.get("class_name", "No_DR"),
        confidence=prediction.get("confidence", 0.0),
        confidence_percent=prediction.get("confidence_percent", 0.0),
        class_probabilities=prediction.get("class_probabilities", {})
    )

    formatted_explainability = ExplainabilityInfo(
        method=explainability.get("method", "Grad-CAM"),
        target_class=explainability.get("target_class", "No_DR"),
        target_layer=explainability.get("target_layer", "res5b_branch2b"),
        heatmap=str(heatmap_path),
        overlay=str(overlay_path),
        heatmap_url=heatmap_url,
        overlay_url=overlay_url
    )

    patient_out = PatientOut.model_validate(patient)

    return ScreeningResponse(
        status=ai_raw_output.get("status", "success"),
        screening_id=db_screening.screening_id,
        patient=patient_out,
        dataset=ai_raw_output.get("dataset", "APTOS 2019"),
        model=ai_raw_output.get("model", "ResNet-18"),
        task=ai_raw_output.get("task", "5-Class Diabetic Retinopathy Classification"),
        image=formatted_image,
        prediction=formatted_prediction,
        explainability=formatted_explainability,
        generated_at=ai_raw_output.get("generated_at", "")
    )

def get_screening_by_id(db: Session, screening_id: str) -> Optional[Screening]:
    return db.query(Screening).filter(Screening.screening_id == screening_id).first()

def get_screenings_by_patient_id(db: Session, patient_id: str) -> List[Screening]:
    return db.query(Screening).filter(Screening.patient_id == patient_id).order_by(Screening.created_at.desc()).all()
