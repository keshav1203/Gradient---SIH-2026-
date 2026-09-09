import os
import re
import logging
import httpx
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

FALLBACK_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "groq/compound",
    "qwen/qwen3.6-27b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]

def strip_markdown(text: str) -> str:
    """Remove markdown formatting characters from LLM output for plain-text chat display."""
    # Remove bold/italic: ***text***, **text**, *text*
    text = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text, flags=re.DOTALL)
    # Remove headings: ### Heading -> Heading
    text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)
    # Remove horizontal rules
    text = re.sub(r'^[-_*]{3,}\s*$', '', text, flags=re.MULTILINE)
    # Remove inline code backticks
    text = re.sub(r'`{1,3}(.*?)`{1,3}', r'\1', text, flags=re.DOTALL)
    # Collapse 3+ newlines to 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def build_system_prompt(patient_name: str, report_context: Optional[Dict[str, Any]] = None, language: str = "en") -> str:
    ctx_str = ""
    if report_context:
        ctx_str = f"""
Patient Name: {patient_name}
Screening Date: {report_context.get('date', 'Recent')}
Examined Eye: {report_context.get('eye', 'Left Eye (OS)')}
Diabetic Retinopathy Grade: {report_context.get('grade', 'Grade 0')}
Clinical Finding: {report_context.get('finding', 'No Diabetic Retinopathy')}
Severity: {report_context.get('severity', 'Normal')}
Clinician Verification: {report_context.get('verified_by', 'Doctor')} ({report_context.get('review_status', 'verified')})
Clinician Advice / Recommendation: {report_context.get('recommendation', 'Annual preventive examination')}
Clinician Notes: {report_context.get('notes', 'None recorded')}
"""
    else:
        ctx_str = f"Patient Name: {patient_name}\nReport details: No screening report on file yet."

    lang_instruction = ""
    if language == "hi":
        lang_instruction = """
CRITICAL LANGUAGE MANDATE:
- The user interface language is selected as HINDI.
- You MUST answer the patient completely in clear, natural, respectful, and highly empathetic Hindi using Devanagari script (हिन्दी).
- Do NOT output your main explanation in English. Translate all medical concepts gently into simple Hindi.
- Keep the tone warm, reassuring, and professional.
"""

    return f"""You are an experienced, compassionate ophthalmologist specialized in diabetic retinopathy at Drishtikon Eye Care.
You are conversing directly with your patient, {patient_name}, to explain their retinal screening report.
{lang_instruction}
PATIENT'S VERIFIED REPORT CONTEXT:
{ctx_str}

YOUR CLINICAL GUIDELINES & ETHICAL BOUNDARIES:
1. When the patient greets you (e.g. "hi", "hello", "hey", "namaste", "नमस्ते"), greet them warmly and respectfully as their eye care doctor and ask how you can help them with their screening report or eye health today. Do not unprompted dump the entire clinical report unless they ask about it.
2. Explain the patient's own report (grading/severity, what fundus imaging shows, what terms like "microaneurysms," "hemorrhages," "exudates," "NPDR/PDR," "macular edema" mean) in simple, reassuring, empathetic, and non-alarming language.
3. Always be empathetic and clear. Avoid excessive medical jargon, and always explain clinical terms gently when used.
4. NEVER provide a diagnosis override, medication names, specific dosages, or definitive treatment prescriptions. You are an explainer and educator, not a replacement for their treating doctor. Always encourage the patient to discuss treatment decisions directly with their treating ophthalmologist.
5. You ONLY have access to context from this logged-in patient's own report. You must NEVER discuss other patients' data, doctor-side technical interfaces, or raw AI model architecture/weights.
6. If the patient asks about unrelated medical conditions, surgeries, or topics outside diabetic eye screening, politely decline and redirect them to their primary healthcare physician or treating doctor.
7. Support both English and Hindi naturally based on the patient's preferred language ({language}).
8. Keep answers structured, conversational, empathetic, and reassuring.
"""

async def query_groq_chat(
    patient_name: str,
    user_message: str,
    report_context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, str]]] = None,
    language: str = "en"
) -> Dict[str, str]:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    primary_model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip()
    system_prompt = build_system_prompt(patient_name, report_context, language)

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        for msg in history[-6:]:
            if msg.get("role") in ("user", "assistant"):
                messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})

    if not api_key:
        logger.info("GROQ_API_KEY not configured, using clinical fallback explainer.")
        return {
            "reply": get_clinical_fallback_response(user_message, patient_name, report_context, language),
            "model": "Drishtikon Retinal Knowledge Base (Set GROQ_API_KEY in .env for live Groq AI inference)"
        }

    # Model cascade list: try primary_model first, then fallback models if 404
    candidate_models = [primary_model]
    for fm in FALLBACK_MODELS:
        if fm not in candidate_models:
            candidate_models.append(fm)

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            for model in candidate_models:
                try:
                    payload = {
                        "model": model,
                        "messages": messages,
                        "temperature": 0.5,
                        "max_tokens": 800
                    }
                    res = await client.post(GROQ_API_URL, headers=headers, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        reply_text = strip_markdown(data["choices"][0]["message"]["content"])
                        return {"reply": reply_text, "model": f"Groq {model}"}
                    elif res.status_code == 404:
                        logger.warning(f"Groq model '{model}' returned 404, attempting next fallback model...")
                        continue
                    else:
                        logger.warning(f"Groq API returned status {res.status_code} for {model}: {res.text}")
                        break
                except httpx.HTTPError as http_err:
                    logger.warning(f"HTTP error with Groq model '{model}': {http_err}")
                    continue
    except Exception as e:
        logger.error(f"Error querying Groq API: {e}")

    return {
        "reply": get_clinical_fallback_response(user_message, patient_name, report_context, language),
        "model": "Drishtikon Retinal Knowledge Base"
    }

def get_clinical_fallback_response(query: str, patient_name: str, report_context: Optional[Dict[str, Any]], language: str = "en") -> str:
    finding = report_context.get("finding", "Diabetic Retinopathy Screening") if report_context else "Eye Examination"
    severity = report_context.get("severity", "Screening completed") if report_context else ""
    recommendation = report_context.get("recommendation", "Please follow up with your ophthalmologist.") if report_context else ""
    verified_by = report_context.get("verified_by", "your clinician") if report_context else "your clinician"
    q = query.strip().lower()

    # Greetings detection: e.g. "hi", "hello", "hey", "namaste", "नमस्ते", "good morning"
    greetings = {"hi", "hello", "hey", "namaste", "नमस्ते", "greetings", "good morning", "good afternoon", "good evening", "सुप्रभात", "नमस्कार"}
    clean_words = [w.strip(".,!?:;\"'") for w in q.split()]
    is_greeting = any(w in greetings for w in clean_words) and not any(k in q for k in ["what", "how", "why", "report", "grade", "doctor", "retina", "eye", "treatment", "microaneurysm"])

    if language == "hi":
        if is_greeting or q in greetings:
            return (
                f"नमस्ते {patient_name}! मैं आपका दृष्टिकोण नेत्र सहायक हूँ। "
                f"मैं यहाँ आपकी रेटिना स्क्रीनिंग रिपोर्ट को समझने और आपकी आँखों के स्वास्थ्य से जुड़े प्रश्नों के उत्तर देने के लिए हूँ। "
                f"आज मैं आपकी क्या सहायता कर सकता हूँ?"
            )
        elif "what" in q or "mean" in q or " मत " in q or "मतलब" in q or "परिणाम" in q or "रिपोर्ट" in q:
            return (
                f"नमस्ते {patient_name}। आपकी स्क्रीनिंग रिपोर्ट के अनुसार आपका परिणाम '{finding}' ({severity}) दर्ज है, "
                f"जिसकी पुष्टि {verified_by} ने की है। "
                f"इसका अर्थ है कि आपकी रेटिना की डिजिटल तस्वीर की जांच मधुमेह के कारण होने वाले सूक्ष्म परिवर्तनों के लिए की गई है। "
                f"यह आपकी दृष्टि को सुरक्षित रखने के लिए एक प्रारंभिक संकेत के रूप में कार्य करता है। "
                f"डॉक्टर की सलाह है: \"{recommendation}\"। "
                f"कृपया अपना रक्त शर्करा नियंत्रित रखें और नियमित फॉलो-अप परामर्श लें।"
            )
        elif "microaneurysm" in q or "hemorrhage" in q or "exudate" in q or "npdr" in q or "pdr" in q or "macular" in q or "लक्षण" in q:
            return (
                f"नेत्र स्वास्थ्य में 'माइक्रोएन्यूरिज्म' का मतलब रेटिना की छोटी रक्त वाहिकाओं में बनने वाले छोटे गुब्बारे जैसे उभार हैं। "
                f"'हेमरेज' या 'एक्सयूडेट्स' रक्त या प्रोटीन के सूक्ष्म रिसाव के बिंदु होते हैं। "
                f"'NPDR' (गैर-प्रसारक डायबिटिक रेटिनोपैथी) एक शुरुआती चरण है जिसे सही समय पर देखभाल से नियंत्रित किया जा सकता है। "
                f"विस्तृत व्यक्तिगत जांच के लिए कृपया {verified_by} से परामर्श लें।"
            )
        else:
            return (
                f"नमस्ते {patient_name}। आपकी नेत्र रिपोर्ट के संदर्भ में: "
                f"आपकी वर्तमान स्थिति '{finding}' है। डॉक्टर की सिफारिश: \"{recommendation}\"। "
                f"मैं आपकी रिपोर्ट के पदों को स्पष्ट करने के लिए यहाँ हूँ। विशिष्ट दवाओं या उपचार के लिए कृपया अपने नेत्र विशेषज्ञ से परामर्श लें।"
            )

    if is_greeting or q in greetings:
        return (
            f"Hello {patient_name}! I am your Drishtikon Retinal Care Assistant. "
            f"I am here to help you understand your retinal screening report and answer any questions about your eye health. "
            f"How can I help you today?"
        )
    elif "what" in q and ("result" in q or "mean" in q or "report" in q or "matlab" in q or "परिणाम" in q):
        return (
            f"Hello {patient_name}. Based on your screening report, your result is recorded as '{finding}' ({severity}), "
            f"verified by {verified_by}. "
            f"What this means is that the digital photograph of your retina was examined for signs of microvascular changes caused by diabetes. "
            f"This serves as an early protective signal to help safeguard your sight. "
            f"Your clinical recommendation is: \"{recommendation}\". "
            f"Please remember to maintain steady blood glucose control and attend your follow-up appointment."
        )
    elif "microaneurysm" in q or "hemorrhage" in q or "exudate" in q or "npdr" in q or "pdr" in q or "macular" in q:
        return (
            f"In diabetic eye care, terms like 'microaneurysms' refer to tiny balloon-like pouches that form on small retinal blood vessels, "
            f"while 'hemorrhages' or 'exudates' are microscopic spots of blood or protein leakage. "
            f"'NPDR' (Non-Proliferative Diabetic Retinopathy) represents an early to moderate phase where prompt management can prevent vision problems. "
            f"These signs show why regular screenings are essential. Please consult {verified_by} for detailed direct retinal examination and guidance."
        )
    else:
        return (
            f"Hello {patient_name}. Regarding your screening for {report_context.get('eye', 'your eye') if report_context else 'your eye'}: "
            f"Your current status is '{finding}'. The recommendation from your doctor is: \"{recommendation}\". "
            f"I am here to explain terms in your report. For diagnosis verification, specific medications, or treatment procedures, please consult your treating eye doctor directly."
        )


