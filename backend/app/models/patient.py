from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(String(50), unique=True, index=True, nullable=False)
    doctor_id = Column(String(50), ForeignKey("doctors.doctor_id", ondelete="SET NULL"), nullable=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    contact_number = Column(String(50), nullable=True)
    medical_history = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    doctor = relationship("Doctor", back_populates="patients")
    screenings = relationship("Screening", back_populates="patient", cascade="all, delete-orphan")

    @property
    def doctor_name(self) -> str | None:
        return self.doctor.name if self.doctor else None

    @property
    def screenings_count(self) -> int:
        return len(self.screenings) if self.screenings else 0

    @property
    def latest_screening_id(self) -> str | None:
        if self.screenings:
            return self.screenings[-1].screening_id
        return None

    @property
    def latest_risk_level(self) -> str:
        if self.screenings:
            cid = self.screenings[-1].predicted_class_id
            if cid is not None:
                if cid >= 3:
                    return "high"
                if cid == 2:
                    return "medium"
                if cid == 1:
                    return "low"
            return "normal"
        return "normal"

    @property
    def latest_review_status(self) -> str:
        if self.screenings:
            return self.screenings[-1].review_status or "pending"
        return "pending"
