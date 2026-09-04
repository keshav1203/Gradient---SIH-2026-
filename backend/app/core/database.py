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
    logger.warning(f"Could not connect to PostgreSQL database ({database_url}). Falling back to SQLite for local session: {e}")
    sqlite_fallback_url = f"sqlite:///{settings.STORAGE_DIR}/dr_screening_fallback.db"
    engine = create_engine(sqlite_fallback_url, connect_args={"check_same_thread": False})

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
