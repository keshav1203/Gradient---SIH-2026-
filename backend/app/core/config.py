import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# config.py is at backend/app/core/config.py (4 levels up to root)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
PROJECT_ROOT = BASE_DIR

# Load .env file into environment from project root
load_dotenv(dotenv_path=PROJECT_ROOT / ".env", override=True)

def _get_database_url() -> str:
    db_env = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/storage/dr_screening_fallback.db")
    if db_env.startswith("sqlite:///") and not db_env.startswith("sqlite:////"):
        rel_subpath = db_env.replace("sqlite:///", "", 1)
        return f"sqlite:///{(BASE_DIR / rel_subpath).resolve()}"
    return db_env

class Settings(BaseSettings):
    PROJECT_NAME: str = "Diabetic Retinopathy Screening API"
    PROJECT_ROOT: Path = BASE_DIR
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = _get_database_url()
    
    # Storage
    STORAGE_DIR: Path = BASE_DIR / "storage"
    UPLOAD_DIR: Path = BASE_DIR / "storage" / "uploads"
    REPORT_DIR: Path = BASE_DIR / "backend" / "reports" / "generated" / "aptos" / "aptos5class" / "inference"
    
    # MATLAB & Model settings
    MATLAB_EXEC: str = os.getenv("MATLAB_EXEC", "matlab")
    MATLAB_SCRIPT_DIR: Path = BASE_DIR / "ml" / "src" / "matlab" / "phase2_classification"
    MODEL_CHECKPOINT_PATH: Path = (
        Path(os.getenv("MODEL_CHECKPOINT_PATH"))
        if os.getenv("MODEL_CHECKPOINT_PATH") and Path(os.getenv("MODEL_CHECKPOINT_PATH")).is_absolute()
        else BASE_DIR / os.getenv("MODEL_CHECKPOINT_PATH", "ml/models/checkpoints/aptos5class/retinalResNet18_APTOS_5CLASS.mat")
    )

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORT_DIR.mkdir(parents=True, exist_ok=True)
