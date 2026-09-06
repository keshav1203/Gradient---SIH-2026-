import os
from pathlib import Path
import pytest

# Ensure all tests run on a dedicated isolated SQLite test database,
# protecting storage/dr_screening_fallback.db from test droptables/mutations.
TEST_DB_FILE = Path(__file__).resolve().parent.parent.parent / "storage" / "test_isolated.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_FILE}"

@pytest.fixture(scope="session", autouse=True)
def isolated_test_database():
    from backend.app.core.database import Base, engine, init_db
    init_db()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    init_db()
    yield
    try:
        if TEST_DB_FILE.exists():
            TEST_DB_FILE.unlink()
    except Exception:
        pass
