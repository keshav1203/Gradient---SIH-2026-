from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doctor_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    dob = Column(String(20), nullable=False)  # Stored in DDMMYYYY format, acts as login password
    email = Column(String(100), nullable=True)
    hospital = Column(String(200), nullable=True, default="District Hospital Eye Care Centre")
    department = Column(String(100), nullable=True, default="Rural Retinal AI Screening Unit")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    patients = relationship("Patient", back_populates="doctor")
    screenings = relationship("Screening", back_populates="doctor")
