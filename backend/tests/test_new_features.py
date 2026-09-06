import io
import uuid
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import init_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def ensure_db_ready():
    init_db()

def create_dummy_image_bytes():
    img = Image.new("RGB", (256, 256), color=(200, 100, 50))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf

def test_doctor_login_and_auth():
    # Valid doctor login with DOB
    res = client.post("/api/v1/auth/doctor/login", json={
        "doctor_id": "DOC-ANITA",
        "password": "15081980"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["role"] == "doctor"
    assert "token" in data
    assert data["doctor"]["doctor_id"] == "DOC-ANITA"

    # Invalid password
    bad_res = client.post("/api/v1/auth/doctor/login", json={
        "doctor_id": "DOC-ANITA",
        "password": "wrongpassword"
    })
    assert bad_res.status_code == 401

    # Non-existent doctor
    bad_doc = client.post("/api/v1/auth/doctor/login", json={
        "doctor_id": "DOC-NONEXISTENT",
        "password": "15081980"
    })
    assert bad_doc.status_code == 401

def test_patient_login_and_auth():
    # Valid patient login with patient_id and phone
    res = client.post("/api/v1/auth/patient/login", json={
        "patient_id": "PT-8924",
        "phone_number": "9876543210"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["role"] == "patient"
    assert "token" in data
    assert data["patient"]["patient_id"] == "PT-8924"

    # Single-field login using Patient ID
    res_id_only = client.post("/api/v1/auth/patient/login", json={
        "identifier": "PT-8924"
    })
    assert res_id_only.status_code == 200
    assert res_id_only.json()["patient"]["patient_id"] == "PT-8924"

    # Single-field login using Phone Number
    res_phone_only = client.post("/api/v1/auth/patient/login", json={
        "identifier": "9876543210"
    })
    assert res_phone_only.status_code == 200
    assert res_phone_only.json()["role"] == "patient"
    assert "token" in res_phone_only.json()
    assert "patient_id" in res_phone_only.json()["patient"]

    # Phone mismatch (legacy two-field)
    mismatch_res = client.post("/api/v1/auth/patient/login", json={
        "patient_id": "PT-8924",
        "phone_number": "1111122222"
    })
    assert mismatch_res.status_code == 401

    # Invalid single identifier
    not_found = client.post("/api/v1/auth/patient/login", json={
        "identifier": "INVALID-ID"
    })
    assert not_found.status_code == 401

def test_doctor_data_isolation():
    # Login as Dr. Anita
    anita_res = client.post("/api/v1/auth/doctor/login", json={
        "doctor_id": "DOC-ANITA",
        "password": "15081980"
    })
    anita_token = anita_res.json()["token"]

    # Login as Dr. Rajesh
    rajesh_res = client.post("/api/v1/auth/doctor/login", json={
        "doctor_id": "DOC-RAJESH",
        "password": "01011975"
    })
    rajesh_token = rajesh_res.json()["token"]

    # Dr. Rajesh creates a patient
    rajesh_pat_id = f"PAT-RAJ-{uuid.uuid4().hex[:6].upper()}"
    client.post(
        "/api/v1/patients/",
        headers={"Authorization": f"Bearer {rajesh_token}"},
        json={
            "patient_id": rajesh_pat_id,
            "first_name": "RajeshPatient",
            "last_name": "Test",
            "age": 42,
            "gender": "Male",
            "contact_number": "+91 9123456780",
            "medical_history": "Rajesh clinic patient"
        }
    )

    # Dr. Anita should NOT see Dr. Rajesh's patient in patient list
    anita_pats = client.get("/api/v1/patients/", headers={"Authorization": f"Bearer {anita_token}"}).json()
    anita_pat_ids = [p["patient_id"] for p in anita_pats]
    assert rajesh_pat_id not in anita_pat_ids

    # Dr. Anita directly querying Dr. Rajesh's patient must return 404 (preventing direct ID manipulation)
    direct_res = client.get(f"/api/v1/patients/{rajesh_pat_id}", headers={"Authorization": f"Bearer {anita_token}"})
    assert direct_res.status_code == 404

    # Dr. Rajesh CAN access their own patient
    raj_direct = client.get(f"/api/v1/patients/{rajesh_pat_id}", headers={"Authorization": f"Bearer {rajesh_token}"})
    assert raj_direct.status_code == 200

def test_screening_mandatory_phone_validation():
    anita_res = client.post("/api/v1/auth/doctor/login", json={
        "doctor_id": "DOC-ANITA",
        "password": "15081980"
    })
    anita_token = anita_res.json()["token"]

    dummy_file = create_dummy_image_bytes()
    files = {"file": ("fundus.png", dummy_file, "image/png")}

    # Missing phone number
    res_missing = client.post(
        "/api/v1/screenings/process",
        headers={"Authorization": f"Bearer {anita_token}"},
        files=files,
        data={
            "first_name": "NoPhone",
            "last_name": "Patient",
            "age": "50",
            "gender": "Male",
            "contact_number": ""
        }
    )
    assert res_missing.status_code == 400
    assert "mandatory" in res_missing.json()["detail"].lower() or "required" in res_missing.json()["detail"].lower()

    # Invalid short phone number
    files2 = {"file": ("fundus2.png", create_dummy_image_bytes(), "image/png")}
    res_short = client.post(
        "/api/v1/screenings/process",
        headers={"Authorization": f"Bearer {anita_token}"},
        files=files2,
        data={
            "first_name": "ShortPhone",
            "last_name": "Patient",
            "age": "50",
            "gender": "Male",
            "contact_number": "12345"
        }
    )
    assert res_short.status_code == 400
    assert "at least 10 digits" in res_short.json()["detail"].lower()

def test_patient_portal_reports_only_real_fundus():
    pat_res = client.post("/api/v1/auth/patient/login", json={
        "patient_id": "PT-8924",
        "phone_number": "9876543210"
    })
    pat_token = pat_res.json()["token"]

    reports_res = client.get("/api/v1/patient/reports", headers={"Authorization": f"Bearer {pat_token}"})
    assert reports_res.status_code == 200
    reports = reports_res.json()
    assert len(reports) >= 1

    for r in reports:
        assert "original_image_url" in r
        assert "heatmap" not in r
        assert "overlay" not in r
        assert "raw_ai_output" not in r
        assert r["patient_id"] == "PT-8924"

def test_patient_portal_chatbot():
    pat_res = client.post("/api/v1/auth/patient/login", json={
        "patient_id": "PT-8924",
        "phone_number": "9876543210"
    })
    pat_token = pat_res.json()["token"]

    chat_res = client.post(
        "/api/v1/patient/chat",
        headers={"Authorization": f"Bearer {pat_token}"},
        json={"message": "Can you explain what my report says about diabetic retinopathy?"}
    )
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert "reply" in data
    assert len(data["reply"]) > 20
    assert "disclaimer" in data

def test_screening_stores_patient_under_doctor():
    # Login as Dr. Manu
    manu_res = client.post("/api/v1/auth/doctor/login", json={
        "doctor_id": "DOC-MANU",
        "password": "10042000"
    })
    assert manu_res.status_code == 200
    manu_token = manu_res.json()["token"]

    unique_pat_id = f"PAT-MANU-{uuid.uuid4().hex[:6].upper()}"
    files = {"file": ("fundus_manu.png", create_dummy_image_bytes(), "image/png")}
    screening_res = client.post(
        "/api/v1/screenings/process",
        headers={"Authorization": f"Bearer {manu_token}"},
        files=files,
        data={
            "patient_id": unique_pat_id,
            "first_name": "Ramesh",
            "last_name": "Verma",
            "age": "52",
            "gender": "Male",
            "contact_number": "+91 9811223344",
            "medical_history": "Type 2 diabetes",
            "doctor_id": "DOC-MANU",
            "doctor_name": "Dr. Manu"
        }
    )
    assert screening_res.status_code == 201
    s_data = screening_res.json()
    assert s_data["doctor_id"] == "DOC-MANU"
    assert s_data["review"]["verified_by"] == "Dr. Manu"
    assert s_data["patient"]["patient_id"] == unique_pat_id
    assert s_data["patient"]["doctor_id"] == "DOC-MANU"
    assert s_data["patient"]["doctor_name"] == "Dr. Manu"

    # Verify patient is in Dr. Manu's patient queue
    manu_patients = client.get("/api/v1/patients/", headers={"Authorization": f"Bearer {manu_token}"}).json()
    manu_pat_ids = [p["patient_id"] for p in manu_patients]
    assert unique_pat_id in manu_pat_ids

    # Verify Dr. Anita does not see Dr. Manu's newly screened patient
    anita_res = client.post("/api/v1/auth/doctor/login", json={
        "doctor_id": "DOC-ANITA",
        "password": "15081980"
    })
    anita_token = anita_res.json()["token"]
    anita_patients = client.get("/api/v1/patients/", headers={"Authorization": f"Bearer {anita_token}"}).json()
    anita_pat_ids = [p["patient_id"] for p in anita_patients]
    assert unique_pat_id not in anita_pat_ids
