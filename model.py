"""
P.H.I. Language Model & Hugging Face Utilities
===============================================
Governs the intelligence, Hugging Face Speech-to-Text (Whisper),
and Text-to-Image (FLUX / SDXL) generation pipelines.
"""
import os
import logging
import json
import urllib.request
import urllib.parse
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("PHI_Model")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY")

def get_groq_response(prompt: str, system_prompt: str = "") -> str:
    """
    Direct call to Groq API using GPT models (e.g. openai/gpt-oss-120b, openai/gpt-oss-20b).
    """
    api_key = os.getenv("GROQ_API_KEY") or GROQ_API_KEY
    if not api_key or api_key == "missing_key":
        return ""

    url = "https://api.groq.com/openai/v1/chat/completions"
    models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"]

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    for model in models:
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 600
        }

        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status == 200:
                    res_json = json.loads(response.read().decode("utf-8"))
                    choices = res_json.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "")
                        clean_content = content.replace("*", "").replace("#", "").replace("`", "").strip()
                        if clean_content:
                            return clean_content
        except Exception as e:
            logger.warning(f"Groq model '{model}' failed: {e}")
            continue

    return ""

def get_gemini_fallback(prompt: str, system_prompt: str = "") -> str:
    """
    Fallback call to Google Gemini.
    """
    api_key = os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY
    if not api_key:
        return ""

    candidate_models = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash"]

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.5, "maxOutputTokens": 600}
    }
    if system_prompt:
        payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

    for model in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    res_json = json.loads(response.read().decode("utf-8"))
                    candidates = res_json.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            text = parts[0].get("text", "")
                            return text.replace("*", "").replace("#", "").replace("`", "").strip()
        except Exception as e:
            logger.warning(f"Gemini fallback model '{model}' failed: {e}")
            continue

    return ""

def hf_transcribe_audio(audio_bytes: bytes, model: str = "openai/whisper-large-v3-turbo") -> str:
    """
    Transcribe audio bytes to text using Hugging Face Whisper models.
    """
    token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY") or HF_TOKEN
    if not token:
        logger.warning("No Hugging Face token found for voice-to-text.")
        return ""

    url = f"https://router.huggingface.co/hf-inference/models/{model}"
    try:
        req = urllib.request.Request(
            url,
            data=audio_bytes,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "audio/wav"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=20) as response:
            if response.status == 200:
                res_json = json.loads(response.read().decode("utf-8"))
                return res_json.get("text", "").strip()
    except Exception as e:
        logger.error(f"Hugging Face STT error: {e}")

    return ""

def hf_generate_image(prompt: str, model: str = "black-forest-labs/FLUX.1-schnell") -> bytes:
    """
    Generate image bytes from text prompt using Hugging Face FLUX / SDXL models.
    """
    token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY") or HF_TOKEN
    if not token:
        logger.warning("No Hugging Face token found for image generation.")
        return b""

    url = f"https://router.huggingface.co/hf-inference/models/{model}"
    payload = json.dumps({"inputs": prompt}).encode("utf-8")

    try:
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            if response.status == 200:
                return response.read()
    except Exception as e:
        logger.error(f"Hugging Face image error: {e}")

    return b""

def get_llm_response(prompt: str, system_prompt: str = "") -> str:
    """
    Core function to get an intelligent spoken response.
    Prefers Groq API GPT models, falling back to Gemini if needed.
    """
    # 1. Try Groq
    groq_res = get_groq_response(prompt, system_prompt)
    if groq_res:
        return groq_res

    # 2. Try Gemini
    gemini_res = get_gemini_fallback(prompt, system_prompt)
    if gemini_res:
        return gemini_res

    return "I am currently waiting for an active API key to formulate a response."
