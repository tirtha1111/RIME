"""
P.H.I. Text-to-Speech Module
============================
Converts text to voice (preferably male).

Requirements:
pip install pyttsx3
"""
import logging
import pyttsx3

logger = logging.getLogger("PHI_TTS")

try:
    engine = pyttsx3.init()
    
    # Try to set to a male voice (depends on OS)
    voices = engine.getProperty('voices')
    for voice in voices:
        # Simple heuristic to find a male voice
        if "male" in voice.name.lower() or "david" in voice.name.lower():
            engine.setProperty('voice', voice.id)
            break
            
    # Adjust speech rate for better clarity
    engine.setProperty('rate', 160)
except Exception as e:
    logger.error(f"Failed to initialize TTS engine: {e}")
    engine = None

def speak(text: str) -> None:
    """Speaks the given text using the initialized TTS engine."""
    if not engine or not text:
        return
        
    logger.info(f"Speaking: {text}")
    try:
        engine.say(text)
        engine.runAndWait()
    except Exception as e:
        logger.error(f"TTS playback failed: {e}")
