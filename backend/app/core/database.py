import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

database_url = settings.DATABASE_URL

# Fallback for local testing if postgres is not available
connect_args = {}
if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(database_url, connect_args=connect_args, pool_pre_ping=True)
    # Test connection
    with engine.connect() as conn:
        pass
except Exception as e:
    logger.error(f"Could not connect to database ({database_url}): {e}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import models so SQLAlchemy metadata registers all tables
    import backend.app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _migrate_schema_columns()
    seed_initial_data()

def _migrate_schema_columns():
    """Ensure doctor_id columns exist in patients and screenings tables on existing databases."""
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            # Check SQLite pragma or standard table columns
            if engine.dialect.name == "sqlite":
                res = conn.execute(text("PRAGMA table_info(patients);")).fetchall()
                cols = [r[1] for r in res]
                if "doctor_id" not in cols:
                    conn.execute(text("ALTER TABLE patients ADD COLUMN doctor_id VARCHAR(50);"))
                    conn.commit()

                res_scr = conn.execute(text("PRAGMA table_info(screenings);")).fetchall()
                cols_scr = [r[1] for r in res_scr]
                if "doctor_id" not in cols_scr:
                    conn.execute(text("ALTER TABLE screenings ADD COLUMN doctor_id VARCHAR(50);"))
                    conn.commit()
            elif engine.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(50);"))
                conn.execute(text("ALTER TABLE screenings ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(50);"))
                conn.commit()
    except Exception as e:
        logger.warning(f"Schema column check: {e}")

def seed_initial_data():
    from backend.app.models.doctor import Doctor
    from backend.app.models.patient import Patient
    from backend.app.models.screening import Screening
    from datetime import datetime, timezone

    db = SessionLocal()
    try:
        # Seed default doctors if they do not exist
        doc_anita = db.query(Doctor).filter(Doctor.doctor_id == "DOC-ANITA").first()
        if not doc_anita:
            logger.info("Seeding default doctor DOC-ANITA...")
            doc_anita = Doctor(
                doctor_id="DOC-ANITA",
                name="Dr. Anita Sharma",
                dob="15081980",  # 15-08-1980 DDMMYYYY format
                email="anita.sharma@drishtikon.health",
                hospital="District Hospital Eye Care Centre",
                department="Rural Retinal AI Screening Unit"
            )
            db.add(doc_anita)
            db.commit()

        doc_rajesh = db.query(Doctor).filter(Doctor.doctor_id == "DOC-RAJESH").first()
        if not doc_rajesh:
            doc_rajesh = Doctor(
                doctor_id="DOC-RAJESH",
                name="Dr. Rajesh Gupta",
                dob="01011975",  # 01-01-1975 DDMMYYYY format
                email="rajesh.gupta@apex.health",
                hospital="Apex Eye Institute",
                department="Vitreoretinal Clinic"
            )
            db.add(doc_rajesh)
            db.commit()

        # Seed Dr. Manu
        doc_manu = db.query(Doctor).filter(Doctor.doctor_id == "DOC-MANU").first()
        if not doc_manu:
            logger.info("Seeding Dr. Manu (DOC-MANU)...")
            doc_manu = Doctor(
                doctor_id="DOC-MANU",
                name="Dr. Manu",
                dob="10042000",  # 10-04-2000 DDMMYYYY format
                email="dr.manu@drishtikon.health",
                hospital="District Hospital Eye Care Centre",
                department="Comprehensive Ophthalmology"
            )
            db.add(doc_manu)
            db.commit()

        # Seed Dr. Keshav
        doc_keshav = db.query(Doctor).filter(Doctor.doctor_id == "DOC-KESHAV").first()
        if not doc_keshav:
            logger.info("Seeding Dr. Keshav (DOC-KESHAV)...")
            doc_keshav = Doctor(
                doctor_id="DOC-KESHAV",
                name="Dr. Keshav",
                dob="12032000",  # 12-03-2000 DDMMYYYY format
                email="dr.keshav@drishtikon.health",
                hospital="Apex Eye Institute",
                department="Retina & Vitreous Services"
            )
            db.add(doc_keshav)
            db.commit()

        # Seed Dr. Trisha
        doc_trisha = db.query(Doctor).filter(Doctor.doctor_id == "DOC-TRISHA").first()
        if not doc_trisha:
            logger.info("Seeding Dr. Trisha (DOC-TRISHA)...")
            doc_trisha = Doctor(
                doctor_id="DOC-TRISHA",
                name="Dr. Trisha",
                dob="05062000",  # 05-06-2000 DDMMYYYY format
                email="dr.trisha@drishtikon.health",
                hospital="Community Eye Care Hospital",
                department="Pediatric & Neuro-Ophthalmology"
            )
            db.add(doc_trisha)
            db.commit()

        # Link any existing unassigned patients/screenings to default doctor
        unassigned_patients = db.query(Patient).filter((Patient.doctor_id == None) | (Patient.doctor_id == "")).all()
        for p in unassigned_patients:
            p.doctor_id = "DOC-ANITA"
        if unassigned_patients:
            db.commit()
            logger.info(f"Assigned {len(unassigned_patients)} existing patients to default doctor DOC-ANITA.")

        unassigned_screenings = db.query(Screening).filter((Screening.doctor_id == None) | (Screening.doctor_id == "")).all()
        for s in unassigned_screenings:
            s.doctor_id = "DOC-ANITA"
        if unassigned_screenings:
            db.commit()
            logger.info(f"Assigned {len(unassigned_screenings)} existing screenings to default doctor DOC-ANITA.")

        # Ensure primary demo patient PT-8924 always exists for patient portal login
        p_demo = db.query(Patient).filter(Patient.patient_id == "PT-8924").first()
        if not p_demo:
            p_demo = Patient(
                patient_id="PT-8924",
                doctor_id="DOC-ANITA",
                first_name="Naresh",
                last_name="Kumar",
                age=58,
                gender="Male",
                contact_number="+91 98765 43210",
                medical_history="Type 2 Diabetes for 8 years, hypertension"
            )
            db.add(p_demo)
            db.commit()

        # Ensure demo screening for PT-8924 exists
        s_demo = db.query(Screening).filter(Screening.screening_id == "SCR-2023-8924").first()
        if not s_demo:
            s_demo = Screening(
                screening_id="SCR-2023-8924",
                patient_id="PT-8924",
                doctor_id="DOC-ANITA",
                media_type="image",
                original_filename="1101fc922132.png",
                original_media_path="1101fc922132.png",
                status="success",
                dataset="APTOS 2019",
                model_name="ResNet-18",
                task="5-Class Diabetic Retinopathy Classification",
                predicted_class_id=2,
                predicted_class_name="Moderate",
                confidence=0.9416,
                confidence_percent=94.16,
                class_probabilities={
                    "No_DR": 0.012,
                    "Mild": 0.034,
                    "Moderate": 0.9416,
                    "Severe": 0.009,
                    "Proliferative_DR": 0.0034
                },
                explainability_method="Grad-CAM",
                target_class="Moderate",
                target_layer="res5b_branch2b",
                heatmap_path="1101fc922132_heatmap.png",
                overlay_path="1101fc922132_gradcam.png",
                review_status="verified",
                review_notes="Microaneurysms and hard exudates confirmed in nasal quadrant. Macular edema excluded. Follow up in 1 month.",
                verified_by="Dr. Anita",
                verified_at=datetime.now(timezone.utc),
                raw_ai_output={"status": "success", "prediction": {"class_id": 2, "class_name": "Moderate"}}
            )
            db.add(s_demo)
            db.commit()

        # Canonical demo patients for baseline clinical records
        demo_patients = [
            {
                "patient_id": "PT-8902",
                "doctor_id": "DOC-ANITA",
                "first_name": "Sunita",
                "last_name": "Devi",
                "age": 62,
                "gender": "Female",
                "contact_number": "+91 98765 43211",
                "medical_history": "Diabetic Retinopathy Grade 1 diagnosis 2024"
            },
            {
                "patient_id": "PT-8901",
                "doctor_id": "DOC-ANITA",
                "first_name": "Anil",
                "last_name": "Sharma",
                "age": 45,
                "gender": "Male",
                "contact_number": "+91 98765 43215",
                "medical_history": "Type 2 Diabetes"
            },
            {
                "patient_id": "PT-8899",
                "doctor_id": "DOC-ANITA",
                "first_name": "Rajesh",
                "last_name": "Kumar",
                "age": 54,
                "gender": "Male",
                "contact_number": "+91 98765 43212",
                "medical_history": "Type 1 Diabetes for 15 years"
            },
            {
                "patient_id": "PT-8845",
                "doctor_id": "DOC-ANITA",
                "first_name": "Priya",
                "last_name": "Patel",
                "age": 47,
                "gender": "Female",
                "contact_number": "+91 98765 43213",
                "medical_history": "Hypertension, early signs of microaneurysms"
            },
            {
                "patient_id": "PT-8812",
                "doctor_id": "DOC-ANITA",
                "first_name": "Amitabh",
                "last_name": "Verma",
                "age": 66,
                "gender": "Male",
                "contact_number": "+91 98765 43214",
                "medical_history": "Severe NPDR follow-up"
            }
        ]

        for p_data in demo_patients:
            if not db.query(Patient).filter(Patient.patient_id == p_data["patient_id"]).first():
                db.add(Patient(**p_data))
        db.commit()

        # Seed additional demo screenings if they don't exist
        demo_screenings = [
            {
                "screening_id": "SCR-2023-8902",
                "patient_id": "PT-8902",
                "doctor_id": "DOC-ANITA",
                "media_type": "image",
                "original_filename": "1101fc922132.png",
                "original_media_path": "1101fc922132.png",
                "status": "success",
                "dataset": "APTOS 2019",
                "model_name": "ResNet-18",
                "task": "5-Class Diabetic Retinopathy Classification",
                "predicted_class_id": 2,
                "predicted_class_name": "Moderate",
                "confidence": 0.88,
                "confidence_percent": 88.0,
                "class_probabilities": {"No_DR": 0.02, "Mild": 0.05, "Moderate": 0.88, "Severe": 0.04, "Proliferative_DR": 0.01},
                "explainability_method": "Grad-CAM",
                "target_class": "Moderate",
                "target_layer": "res5b_branch2b",
                "heatmap_path": "1101fc922132_heatmap.png",
                "overlay_path": "1101fc922132_gradcam.png",
                "review_status": "pending",
                "review_notes": "Awaiting final dilation review.",
                "verified_by": "Dr. Anita",
                "verified_at": datetime.now(timezone.utc),
                "raw_ai_output": {"status": "success", "prediction": {"class_id": 2, "class_name": "Moderate"}}
            },
            {
                "screening_id": "SCR-2023-8901",
                "patient_id": "PT-8901",
                "doctor_id": "DOC-ANITA",
                "media_type": "image",
                "original_filename": "sample_fundus.png",
                "original_media_path": "sample_fundus.png",
                "status": "success",
                "dataset": "APTOS 2019",
                "model_name": "ResNet-18",
                "task": "5-Class Diabetic Retinopathy Classification",
                "predicted_class_id": 0,
                "predicted_class_name": "No_DR",
                "confidence": 0.98,
                "confidence_percent": 98.0,
                "class_probabilities": {"No_DR": 0.98, "Mild": 0.01, "Moderate": 0.005, "Severe": 0.003, "Proliferative_DR": 0.002},
                "explainability_method": "Grad-CAM",
                "target_class": "No_DR",
                "target_layer": "res5b_branch2b",
                "heatmap_path": "1101fc922132_heatmap.png",
                "overlay_path": "1101fc922132_gradcam.png",
                "review_status": "verified",
                "review_notes": "Clear fundus. No diabetic retinopathy changes detected.",
                "verified_by": "Dr. Anita",
                "verified_at": datetime.now(timezone.utc),
                "raw_ai_output": {"status": "success", "prediction": {"class_id": 0, "class_name": "No_DR"}}
            },
            {
                "screening_id": "SCR-2023-8899",
                "patient_id": "PT-8899",
                "doctor_id": "DOC-ANITA",
                "media_type": "image",
                "original_filename": "1101fc922132.png",
                "original_media_path": "1101fc922132.png",
                "status": "success",
                "dataset": "APTOS 2019",
                "model_name": "ResNet-18",
                "task": "5-Class Diabetic Retinopathy Classification",
                "predicted_class_id": 1,
                "predicted_class_name": "Mild",
                "confidence": 0.65,
                "confidence_percent": 65.0,
                "class_probabilities": {"No_DR": 0.25, "Mild": 0.65, "Moderate": 0.08, "Severe": 0.015, "Proliferative_DR": 0.005},
                "explainability_method": "Grad-CAM",
                "target_class": "Mild",
                "target_layer": "res5b_branch2b",
                "heatmap_path": "1101fc922132_heatmap.png",
                "overlay_path": "1101fc922132_gradcam.png",
                "review_status": "review_required",
                "review_notes": "Suboptimal image exposure. Retake scan before clinical conclusion.",
                "verified_by": "Dr. Anita",
                "verified_at": datetime.now(timezone.utc),
                "raw_ai_output": {"status": "success", "prediction": {"class_id": 1, "class_name": "Mild"}}
            }
        ]

        for s_data in demo_screenings:
            if not db.query(Screening).filter(Screening.screening_id == s_data["screening_id"]).first():
                db.add(Screening(**s_data))
        db.commit()
        logger.info("Database seeding completed successfully.")
    except Exception as e:
        logger.warning(f"Could not seed initial data: {e}")
        db.rollback()
    finally:
        db.close()
