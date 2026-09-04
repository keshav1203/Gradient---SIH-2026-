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
    seed_initial_data()

def seed_initial_data():
    from backend.app.models.patient import Patient
    from backend.app.models.screening import Screening
    from datetime import datetime, timezone

    db = SessionLocal()
    try:
        if db.query(Patient).count() == 0:
            logger.info("Seeding initial demo patients and screenings...")
            p1 = Patient(
                patient_id="PT-8924",
                first_name="Naresh",
                last_name="Kumar",
                age=58,
                gender="Male",
                contact_number="+91 98765 43210",
                medical_history="Type 2 Diabetes for 8 years, hypertension"
            )
            p2 = Patient(
                patient_id="PT-8902",
                first_name="Sunita",
                last_name="Devi",
                age=62,
                gender="Female",
                contact_number="+91 98765 43211",
                medical_history="Diabetic Retinopathy Grade 1 diagnosis 2024"
            )
            p3 = Patient(
                patient_id="PT-8891",
                first_name="Rajesh",
                last_name="Sharma",
                age=51,
                gender="Male",
                contact_number="+91 98765 43212",
                medical_history="Type 1 Diabetes for 15 years"
            )
            p4 = Patient(
                patient_id="PT-8845",
                first_name="Priya",
                last_name="Patel",
                age=47,
                gender="Female",
                contact_number="+91 98765 43213",
                medical_history="Hypertension, early signs of microaneurysms"
            )
            p5 = Patient(
                patient_id="PT-8812",
                first_name="Amitabh",
                last_name="Verma",
                age=66,
                gender="Male",
                contact_number="+91 98765 43214",
                medical_history="Severe NPDR follow-up"
            )
            db.add_all([p1, p2, p3, p4, p5])
            db.commit()

            # Seed demo screening for Naresh Kumar
            s1 = Screening(
                screening_id="SCR-2023-8924",
                patient_id="PT-8924",
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
            db.add(s1)
            db.commit()
            logger.info("Database seeding completed successfully.")
    except Exception as e:
        logger.warning(f"Could not seed initial data: {e}")
        db.rollback()
    finally:
        db.close()
