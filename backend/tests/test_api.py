import io
import uuid
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine, init_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()
    # Drop and recreate tables for clean test isolation across repeated pytest invocations
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

client = TestClient(app)

def create_dummy_image_bytes():
    img = Image.new("RGB", (256, 256), color=(200, 100, 50))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "version" in response.json()

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "database" in data
    assert "matlab_engine" in data

def test_create_and_get_patient():
    unique_pat_id = f"PAT-TEST-{uuid.uuid4().hex[:6].upper()}"
    patient_payload = {
        "patient_id": unique_pat_id,
        "first_name": "Trisha",
        "last_name": "Tyagi",
        "age": 45,
        "gender": "Female",
        "contact_number": "+91 9876543210",
        "medical_history": "Diabetic for 5 years"
    }
    response = client.post("/api/v1/patients/", json=patient_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["patient_id"] == unique_pat_id
    assert data["first_name"] == "Trisha"

    # Get patient
    get_res = client.get(f"/api/v1/patients/{unique_pat_id}")
    assert get_res.status_code == 200
    assert get_res.json()["last_name"] == "Tyagi"

def test_process_screening_image():
    unique_pat_id = f"PAT-TEST-{uuid.uuid4().hex[:6].upper()}"
    img_bytes = create_dummy_image_bytes()
    files = {
        "file": ("0ae2dd2e09ea.png", img_bytes, "image/png")
    }
    data = {
        "first_name": "Trisha",
        "last_name": "Tyagi",
        "age": "45",
        "gender": "Female",
        "patient_id": unique_pat_id,
        "contact_number": "+91 9999988888",
        "medical_history": "Type 2 Diabetes"
    }
    response = client.post("/api/v1/screenings/process", files=files, data=data)
    assert response.status_code == 201
    res_json = response.json()

    # Validate output JSON fields matching the MATLAB structure from screenshot
    assert res_json["status"] == "success"
    assert res_json["dataset"] == "APTOS 2019"
    assert res_json["model"] == "ResNet-18"
    assert res_json["task"] == "5-Class Diabetic Retinopathy Classification"
    
    # Image section
    assert "image" in res_json
    assert "filename" in res_json["image"]
    assert "original_path" in res_json["image"]

    # Prediction section
    assert "prediction" in res_json
    pred = res_json["prediction"]
    assert "class_id" in pred
    assert "class_name" in pred
    assert "confidence" in pred
    assert "confidence_percent" in pred
    assert "class_probabilities" in pred
    assert "No_DR" in pred["class_probabilities"]

    # Explainability section
    assert "explainability" in res_json
    expl = res_json["explainability"]
    assert expl["method"] == "Grad-CAM"
    assert "target_class" in expl
    assert "target_layer" in expl
    assert "heatmap" in expl
    assert "overlay" in expl

    # Timestamp
    assert "generated_at" in res_json
    assert "patient" in res_json
    assert res_json["patient"]["patient_id"] == unique_pat_id

    # Test retrieving screenings by patient ID
    res = client.get(f"/api/v1/screenings/patient/{unique_pat_id}")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1
    assert items[0]["patient_id"] == unique_pat_id
