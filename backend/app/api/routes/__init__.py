from backend.app.api.routes.health import router as health_router
from backend.app.api.routes.patients import router as patients_router
from backend.app.api.routes.screenings import router as screenings_router

__all__ = ["health_router", "patients_router", "screenings_router"]
