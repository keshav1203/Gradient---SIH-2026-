import sys
from pathlib import Path
import uvicorn

# Ensure the project root directory is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

if __name__ == "__main__":
    uvicorn.run(
        "backend.app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        app_dir=str(PROJECT_ROOT)
    )
