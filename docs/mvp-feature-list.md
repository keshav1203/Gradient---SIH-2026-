# MVP Feature List

1. **Image Quality Check** — basic blur/lighting/resolution check; flag poor uploads
2. **DR Diagnostic Model** — fine-tuned EfficientNet-B0 on APTOS, fixed degradation
   augmentation (downscale, blur, compression, brightness), outputs DR present/absent
   + severity grade (0–4)
3. **Grad-CAM Heatmap** — visual overlay of regions driving the prediction
4. **Confidence Flagging (simplified)** — softmax-threshold score, auto-flag low
   confidence for review
5. **Doctor Portal** — login, upload, view prediction/heatmap/confidence,
   approve/reject, manage patient list
6. **Patient Portal** — login, view own report; LLM-based plain-language explanation
   (single prompt: structured data + doctor-reviewed reference blurb); bilingual
   (English/Hindi) output via one multilingual model; no live notifications
7. **Report Generation** — templated HTML/PDF: image + heatmap + severity +
   confidence + doctor sign-off

See `v2-backlog.md` for what's explicitly out of scope for this MVP.
