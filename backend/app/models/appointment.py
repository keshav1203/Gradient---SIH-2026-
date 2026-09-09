from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    appointment_id = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(String(50), ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(String(50), ForeignKey("doctors.doctor_id", ondelete="SET NULL"), nullable=True, index=True)
    doctor_name = Column(String(100), nullable=True)
    appointment_date = Column(String(50), nullable=False)
    appointment_time = Column(String(50), nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Confirmed")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    patient = relationship("Patient", backref="appointments")
    doctor = relationship("Doctor", backref="appointments")
