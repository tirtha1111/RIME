import datetime
from json import JSONDecodeError, dump, load
import logging
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import dotenv_values
from groq import Groq

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("RealtimeSearchEngine")

# --- Path & Environment Config ---
PROJECT_ROOT = Path(__file__).resolve().parents[1] if len(Path(__file__).resolve().parents) > 1 else Path(__file__).resolve().parent
CHAT_LOG_PATH = PROJECT_ROOT / "Data" / "ChatLog.json"

env_vars = dotenv_values(PROJECT_ROOT / ".env")
Username = env_vars.get("Username", "User")
Assistantname = env_vars.get("Assistantname", "Assistant")
GroqAPIKey = env_vars.get("GroqAPIKey")

if not GroqAPIKey:
    raise ValueError("GroqAPIKey missing in environment variables (.env file).")

client = Groq(api_key=GroqAPIKey)

# --- Strict Prompt Instructions ---
SYSTEM_PROMPT = f"""You are {Assistantname}, a precise assistant created for {Username}.
STRICT RULES FOR YOUR RESPONSES:
1. Provide extremely direct, crisp, and concise answers.
2. DO NOT write meta-reasoning, source analysis, or section headers like "Reasoning", "Sources consulted", or "Conclusion".
3. State facts clearly using proper grammar and end punctuation."""


def GetActiveGroqModels() -> List[str]:
    """Dynamically fetches available chat completion models from Groq, filtering out utility/guard models."""
    priority = [
        "groq/compound",
        "groq/compound-mini",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "llama3-70b-8192",
        "llama3-8b-8192",
        "mixtral-8x7b-32768"
    ]

    EXCLUDED_PATTERNS = ["guard", "prompt-guard", "safeguard", "whisper", "vision", "embed"]

    try:
        models_data = client.models.list()
        available_ids = [m.id for m in models_data.data if m.id]

        valid_models = [
            m_id for m_id in available_ids
            if not any(pattern in m_id.lower() for pattern in EXCLUDED_PATTERNS)
        ]

        sorted_models = [m for m in priority if m in valid_models]
        for m_id in valid_models:
            if m_id not in sorted_models:
                sorted_models.append(m_id)

        if sorted_models:
            return sorted_models
    except Exception as e:
        logger.warning(f"Could not list active models dynamically: {e}")

    return ["groq/compound", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"]


def ReadHistory() -> List[Dict[str, str]]:
    if not CHAT_LOG_PATH.exists():
        CHAT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with CHAT_LOG_PATH.open("w", encoding="utf-8") as f:
            dump([], f)
        return []
    try:
        with CHAT_LOG_PATH.open("r", encoding="utf-8") as f:
            return load(f)
    except (JSONDecodeError, OSError):
        return []


def SaveHistory(history: List[Dict[str, str]]) -> None:
    CHAT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CHAT_LOG_PATH.open("w", encoding="utf-8") as f:
        # Prevent file bloat by keeping only the last 20 messages saved
        dump(history[-20:], f, indent=4)


def RealtimeSearchEngine(prompt: str) -> str:
    history = ReadHistory()

    # FIX FOR 'Request Entity Too Large': Limit payload to last 6 messages (3 turns)
    active_history = history[-6:]
    active_history.append({"role": "user", "content": prompt})

    now = datetime.datetime.now()
    time_context = f"Current Time Context: {now.strftime('%d %B %Y')}, {now.strftime('%A')}, {now.strftime('%H:%M:%S')}."

    system_messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": time_context},
    ]

    models = GetActiveGroqModels()
    completion = None
    used_model = None

    for model_id in models:
        try:
            logger.info(f"Attempting completion with model: '{model_id}'")
            completion = client.chat.completions.create(
                model=model_id,
                messages=system_messages + active_history,
                temperature=0.2,
                max_tokens=800,
                stream=True,
            )
            used_model = model_id
            break
        except Exception as e:
            if any(err_code in str(e) for err_code in ["404", "400", "model_not_found"]):
                logger.warning(f"Model '{model_id}' failed with error: {e}. Cascading to next fallback...")
                continue
            logger.error(f"API Error on model '{model_id}': {e}")
            return f"API Error: {e}"

    if not completion:
        return "I apologize, but no suitable Groq model was available to handle your query."

    try:
        response_chunks = []
        for chunk in completion:
            content = chunk.choices[0].delta.content
            if content:
                response_chunks.append(content)

        full_response = "".join(response_chunks).strip()

        # Update history
        history.append({"role": "user", "content": prompt})
        history.append({"role": "assistant", "content": full_response})
        SaveHistory(history)

        return full_response
    except Exception as e:
        logger.error(f"Streaming error on model '{used_model}': {e}")
        return f"Streaming error: {e}"


if __name__ == "__main__":
    print(f"--- {Assistantname} Realtime Engine Online ---")
    while True:
        try:
            query = input("\nENTER YOUR QUERY: ").strip()
            if query.lower() in ("exit", "quit", "q"):
                print("Exiting engine.")
                break
            if query:
                print(f"\n{Assistantname}:\n" + RealtimeSearchEngine(query))
        except (KeyboardInterrupt, EOFError):
            print("\nShutting down engine.")
            break