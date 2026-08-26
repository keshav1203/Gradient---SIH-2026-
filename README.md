# 👁️ Explainable AI (XAI) Diabetic Retinopathy Screening Platform
 
### Smart India Hackathon 2026 | Problem Statement ID: `SIH26038`
### Team Name: `Gradient`
 
A clinical decision-support platform that uses **Explainable AI** to screen for Diabetic Retinopathy (DR) — built specifically for real-world rural healthcare conditions: poor image quality, unstable internet, and patient language barriers.
 
---
 
## 📌 Problem Statement
 
Diabetic Retinopathy is one of the leading causes of preventable blindness worldwide, and India — with one of the largest diabetic populations globally — faces a severe screening gap. Millions of diabetic patients remain undiagnosed until vision loss becomes irreversible, largely due to:
 
- **Shortage of ophthalmologists**, especially in rural and semi-urban areas
- **Manual screening** that is time-consuming, subjective, and dependent on expert availability
- **Low-quality diagnostic inputs**, since rural centers often lack access to high-resolution fundus cameras
- **Unreliable internet connectivity**, disrupting access to cloud-based diagnostic tools
- **Language and literacy barriers**, preventing patients from understanding technical medical reports
- **Lack of trust in AI diagnosis**, due to black-box predictions with no visual justification
There is a critical need for an accurate, robust, and accessible AI screening solution that works reliably in low-resource settings, explains its reasoning to doctors, and communicates results to patients in their own language — enabling early referral and timely intervention.
 
---
 
## 💡 Our Solution
 
We are building an **Explainable AI DR Screening Platform** that goes beyond simple classification — it validates image quality, explains its predictions visually, flags uncertain cases for human review, and delivers results to patients through a multilingual, voice-enabled interface.
 
---
 
## 🧠 Core AI Pipeline
 
| Stage | Function |
|-------|----------|
| **1. Quality Assessment** | Evaluates blur, lighting, and resolution before diagnosis. Poor-quality scans are flagged or rejected to prevent overconfident, incorrect predictions. |
| **2. Robust Diagnostics** | Detects DR, classifies severity, and localizes lesions. Model is intentionally trained on degraded images to perform reliably in low-resource environments. |
| **3. Uncertainty Estimation** | Generates a confidence score for every prediction; low-confidence cases are automatically flagged for human review. |
| **4. Explainable AI (XAI)** | Uses Grad-CAM to produce visual heatmaps showing exactly where and why the model detected an abnormality. |
| **5. Report Generation** | Compiles findings into a structured, clinician-approved medical report. |
 
---
 
## 🖥️ Dual-Portal System
 
### 👨‍⚕️ Doctor Portal
- Manage patient records
- Upload fundus images/videos
- Review AI-generated Grad-CAM heatmaps
- Approve or edit AI-generated reports before finalization
### 🧑‍🦱 Patient Portal
- Mobile-friendly app to access results
- **Multilingual Voice AI Assistant** that explains medical jargon in plain, native-language terms (e.g., English, Hindi)
- Speech-to-Text and Text-to-Speech support for low-literacy users
---
 
## 🚧 Challenges & Our Solutions
 
| # | Challenge | Our Approach |
|---|-----------|--------------|
| 1 | **Low image quality** — rural centers often lack high-resolution cameras | Train the model on artificially degraded images (downscaling, noise, blur, compression artifacts) so it generalizes to real-world low-res captures |
| 2 | **Unreliable internet connectivity** — frequent outages disrupt cloud AI access | Deploy a lightweight **on-device offline AI model** that runs locally; syncs collected data to the central database once connectivity resumes |
| 3 | **Language barrier** | Built-in multilingual support for interaction and output in native/regional languages |
| 4 | **Low literacy & limited English proficiency** | Combine (a) AI-simplified plain-language reports with clear risk breakdowns and (b) a voice-based assistant (STT + TTS) so users can speak and listen instead of read/type |
| 5 | **Lack of trust & transparency in AI diagnosis** | Auto-generate reports with the original image + Grad-CAM heatmap overlay, routed to a doctor for manual review before being finalized — ensuring human-in-the-loop accountability |
 
---
 
## 🚀 Key Features
 
- ✅ **Pre-diagnostic Quality Gate** — rejects unusable scans before they reach the model
- ✅ **Severity Classification** — grades DR across standard clinical stages
- ✅ **Lesion Localization** — pinpoints affected retinal regions
- ✅ **Explainable Heatmaps (Grad-CAM)** — visual justification for every prediction
- ✅ **Confidence-Aware Predictions** — automatic escalation of uncertain cases to doctors
- ✅ **Offline-First Architecture** — on-device inference with auto-sync when online
- ✅ **Multilingual Voice Assistant** — accessible to low-literacy, regional-language users
- ✅ **Human-in-the-Loop Reporting** — every AI report is doctor-reviewed before finalization
---
 
## 🩺 DR Severity Stages Classified
 
| Stage | Description |
|-------|-------------|
| 0 – No DR | No visible abnormalities |
| 1 – Mild | Microaneurysms present |
| 2 – Moderate | More extensive vascular damage |
| 3 – Severe | Significant blood vessel blockage |
| 4 – Proliferative DR | Abnormal new vessel growth, high risk of blindness |
 
---
