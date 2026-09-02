from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.api.deps import get_db_session
from backend.app.services.matlab_service import matlab_service

router = APIRouter()

@router.get("/health")
def health_check(db: Session = Depends(get_db_session)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    matlab_status = "available" if matlab_service.is_matlab_available() else "fallback_mode (Python Engine)"

    return {
        "status": "ok",
        "database": db_status,
        "matlab_engine": matlab_status
    }
