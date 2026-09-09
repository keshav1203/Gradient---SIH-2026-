import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import init_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db()

def test_get_available_doctors():
    res = client.get("/api/v1/patient/doctors")
    assert res.status_code == 200
    doctors = res.json()
    assert isinstance(doctors, list)
    assert len(doctors) >= 5
    doc_ids = [d["doctor_id"] for d in doctors]
    assert "DOC-ANITA" in doc_ids
    assert "DOC-RAJESH" in doc_ids

def test_patient_appointment_booking_and_data_isolation():
    # Login patient PT-8924
    patient_headers = {"X-Patient-Id": "PT-8924"}
    
    # Book consultation with Dr. Anita
    booking_payload = {
        "doctor_id": "DOC-ANITA",
        "appointment_date": "2026-09-15",
        "appointment_time": "10:30 AM",
        "reason": "Moderate DR consultation and retinal follow-up"
    }
    res = client.post("/api/v1/patient/appointments", json=booking_payload, headers=patient_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["doctor_id"] == "DOC-ANITA"
    assert data["patient_id"] == "PT-8924"
    assert data["appointment_date"] == "2026-09-15"
    assert data["status"] == "Confirmed"
    
    # Get patient appointments
    get_res = client.get("/api/v1/patient/appointments", headers=patient_headers)
    assert get_res.status_code == 200
    appts = get_res.json()
    assert any(a["appointment_id"] == data["appointment_id"] for a in appts)

    # Doctor DOC-ANITA should see this appointment
    doc_anita_headers = {"X-Doctor-Id": "DOC-ANITA"}
    doc_res = client.get("/api/v1/doctor/appointments", headers=doc_anita_headers)
    assert doc_res.status_code == 200
    doc_appts = doc_res.json()
    assert any(a["appointment_id"] == data["appointment_id"] for a in doc_appts)

    # Doctor DOC-RAJESH should NOT see DOC-ANITA's appointment (Data Isolation)
    doc_rajesh_headers = {"X-Doctor-Id": "DOC-RAJESH"}
    rajesh_res = client.get("/api/v1/doctor/appointments", headers=doc_rajesh_headers)
    assert rajesh_res.status_code == 200
    rajesh_appts = rajesh_res.json()
    assert not any(a["appointment_id"] == data["appointment_id"] for a in rajesh_appts)

def test_patient_chat_hindi_response():
    patient_headers = {"X-Patient-Id": "PT-8924"}
    chat_payload = {
        "message": "नमस्ते, मेरी रिपोर्ट का क्या मतलब है?",
        "language": "hi"
    }
    res = client.post("/api/v1/patient/chat", json=chat_payload, headers=patient_headers)
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert len(data["reply"]) > 0
