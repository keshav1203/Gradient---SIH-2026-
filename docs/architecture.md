# Architecture Notes (draft)

_To be filled in as design decisions are made. Suggested starting shape:_

Doctor Portal (React) ──┐
                         ├─→ Backend API (FastAPI) ─→ Postgres (users, patients, reports)
Patient Portal (React) ─┘        │
                                  ├─→ ML Inference Service (quality check → EfficientNet-B0 → Grad-CAM → confidence)
                                  ├─→ LLM Explanation Service (single-prompt, bilingual)
                                  └─→ Report Generator (HTML → PDF)
