import logging
from pathlib import Path
from PIL import Image

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

def is_video_file(file_path: Path) -> bool:
    return file_path.suffix.lower() in VIDEO_EXTENSIONS

def is_image_file(file_path: Path) -> bool:
    return file_path.suffix.lower() in IMAGE_EXTENSIONS

def process_media_file(file_path: Path, output_dir: Path) -> Path:
    """
    If file is a video, extracts a keyframe image and saves it to output_dir.
    If file is an image, returns the original image path.
    """
    if is_image_file(file_path):
        return file_path

    if is_video_file(file_path):
        try:
            import cv2
            cap = cv2.VideoCapture(str(file_path))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if total_frames > 0:
                # Target middle frame
                target_frame = total_frames // 2
                cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
                ret, frame = cap.read()
                if ret:
                    extracted_image_path = output_dir / f"{file_path.stem}_frame.png"
                    cv2.imwrite(str(extracted_image_path), frame)
                    cap.release()
                    return extracted_image_path
            cap.release()
        except Exception as e:
            logger.warning(f"OpenCV video extraction error ({e}). Creating keyframe placeholder.")

        # Fallback keyframe creation if cv2 fails
        keyframe_path = output_dir / f"{file_path.stem}_frame.png"
        img = Image.new("RGB", (512, 512), color=(0, 0, 0))
        img.save(keyframe_path)
        return keyframe_path

    return file_path
