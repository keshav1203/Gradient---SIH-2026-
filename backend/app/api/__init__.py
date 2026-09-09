from fastapi import APIRouter
from backend.app.api.routes.health import router as health_router
from backend.app.api.routes.patients import router as patients_router
from backend.app.api.routes.screenings import router as screenings_router
from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.patient_portal import router as patient_portal_router, doctor_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(auth_router)
api_router.include_router(patient_portal_router)
api_router.include_router(doctor_router)
api_router.include_router(patients_router)
api_router.include_router(screenings_router)
