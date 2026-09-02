import os
import uuid
from pathlib import Path
from fastapi import UploadFile
from backend.app.core.config import settings

def generate_unique_filename(original_filename: str) -> str:
    ext = Path(original_filename).suffix.lower()
    if not ext:
        ext = ".png"
    unique_id = uuid.uuid4().hex[:12]
    return f"{unique_id}{ext}"

async def save_upload_file(upload_file: UploadFile, target_dir: Path = None) -> Path:
    if target_dir is None:
        target_dir = settings.UPLOAD_DIR

    target_dir.mkdir(parents=True, exist_ok=True)
    filename = generate_unique_filename(upload_file.filename)
    file_path = target_dir / filename

    content = await upload_file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Reset cursor
    await upload_file.seek(0)
    return file_path
