#!/usr/bin/env python3
"""
Verify connection between ML Model and Backend in Drishtikon.
"""
import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.core.config import settings
from backend.app.services.matlab_service import matlab_service

def main():
    print("=" * 60)
    print(" DRISHTIKON: MODEL TO BACKEND CONNECTION VERIFICATION")
    print("=" * 60)

    # 1. Check MATLAB executable
    matlab_avail = matlab_service.is_matlab_available()
    print(f"[1] MATLAB Executable ({settings.MATLAB_EXEC}): {'FOUND' if matlab_avail else 'NOT FOUND'}")
    if not matlab_avail:
        print("    ERROR: MATLAB is not found in PATH!")
        sys.exit(1)

    # 2. Check Model Checkpoint
    model_path = settings.MODEL_CHECKPOINT_PATH
    model_exists = matlab_service.is_model_available()
    print(f"[2] Model Checkpoint: {model_path}")
    print(f"    Status: {'EXISTS (' + str(round(model_path.stat().st_size / (1024*1024), 2)) + ' MB)' if model_exists else 'MISSING'}")
    if not model_exists:
        print("    ERROR: Model checkpoint file is missing!")
        sys.exit(1)

    # 3. Check Script Directory
    script_dir = settings.MATLAB_SCRIPT_DIR
    print(f"[3] MATLAB Inference Script Dir: {script_dir}")
    backend_script = script_dir / "runAPTOSInferenceBackend.m"
    print(f"    runAPTOSInferenceBackend.m: {'FOUND' if backend_script.exists() else 'MISSING'}")

    # 4. Find a test image (prefer genuine retinal fundus scans over small dummy images)
    uploads_dir = settings.UPLOAD_DIR
    candidates = [
        p for p in (list(uploads_dir.glob("*.png")) + list(uploads_dir.glob("*.jpg")) + list(uploads_dir.glob("*.tif")))
        if p.is_file() and p.stat().st_size > 10000
    ]
    if not candidates:
        all_images = list(uploads_dir.glob("*.png")) + list(uploads_dir.glob("*.jpg"))
        candidates = [p for p in all_images if p.is_file()]

    if not candidates:
        print("    No sample images in storage/uploads. Using fallback test generation...")
        from PIL import Image
        test_img = uploads_dir / "test_sample.png"
        img = Image.new("RGB", (512, 512), color=(100, 40, 20))
        img.save(test_img)
    else:
        test_img = candidates[0]

    print(f"\n[4] Running live inference on sample fundus image:\n    {test_img}")
    print("    Invoking MATLAB model...")
    result = matlab_service.run_inference(test_img)

    status = result.get('status')
    print("\n[5] INFERENCE RESULT:")
    print(f"    Status:              {status}")
    print(f"    Model Name:          {result.get('model')}")
    print(f"    Task:                {result.get('task')}")

    if status == 'rejected':
        print("\n[!] Retinal image quality assessment rejected this scan:")
        print(f"    Reason:         {result.get('rejection_reason')}")
        print(f"    Recommendation: {result.get('recommendation')}")
        qa = result.get('quality_assessment', {})
        print(f"    Quality Score:  {qa.get('overall_score')}% ({qa.get('decision')})")
        print("\n" + "=" * 60)
        print(" Quality Gate Verified: Substandard images correctly rejected.")
        print("=" * 60)
        return
    elif status != 'success':
        print(f"\n[!] Inference returned error status '{status}': {result.get('error') or result.get('detail')}")
        sys.exit(1)

    pred = result.get('prediction', {})
    print(f"    Predicted Class ID:  {pred.get('class_id')}")
    print(f"    Predicted Class:     {pred.get('class_name')}")
    print(f"    Confidence:          {pred.get('confidence_percent', 0):.2f}%")
    print("    Class Probabilities:")
    for cname, prob in pred.get('class_probabilities', {}).items():
        print(f"      - {cname:18s}: {prob*100:.2f}%")

    expl = result.get('explainability', {})
    print(f"    Explainability:      {expl.get('method')} on target layer '{expl.get('target_layer')}'")
    print(f"    Dynamic Opacity:     {expl.get('dynamic_opacity', 'N/A')}")
    print(f"    Retina Masked:       {expl.get('retina_masked', False)}")
    print(f"    Grad-CAM Heatmap:    {expl.get('heatmap')}")
    print(f"    Grad-CAM Overlay:    {expl.get('overlay')}")

    # Validate output files exist and dimensions match
    heatmap_str = expl.get('heatmap')
    overlay_str = expl.get('overlay')
    assert heatmap_str and Path(heatmap_str).is_file(), f"Heatmap file missing: {heatmap_str}"
    assert overlay_str and Path(overlay_str).is_file(), f"Overlay file missing: {overlay_str}"
    heatmap_file = Path(heatmap_str)
    overlay_file = Path(overlay_str)

    from PIL import Image
    orig_im = Image.open(test_img)
    heat_im = Image.open(heatmap_file)
    over_im = Image.open(overlay_file)

    print(f"\n[6] IMAGE LAYER VERIFICATION:")
    print(f"    Original Scan:       {orig_im.size} ({orig_im.mode})")
    print(f"    Grad-CAM Heatmap:    {heat_im.size} ({heat_im.mode})")
    print(f"    Composite Overlay:   {over_im.size} ({over_im.mode})")

    assert heat_im.size == orig_im.size, f"Heatmap size {heat_im.size} doesn't match original {orig_im.size}"
    assert over_im.size == orig_im.size, f"Overlay size {over_im.size} doesn't match original {orig_im.size}"
    assert heat_im.mode == "RGBA", f"Heatmap should be RGBA transparent image, got {heat_im.mode}"

    alpha_extrema = heat_im.getchannel("A").getextrema()
    print(f"    Heatmap Alpha Range: min={alpha_extrema[0]} (transparent outside retina), max={alpha_extrema[1]}")
    assert alpha_extrema[0] == 0, "Heatmap alpha minimum should be 0 (masked outside retina)!"

    print("\n" + "=" * 60)
    print(" SUCCESS: Model & Retina-Masked Grad-CAM are fully verified!")
    print("=" * 60)

if __name__ == "__main__":
    main()
