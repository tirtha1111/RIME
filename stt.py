"""
P.H.I. Speech-to-Text Module
============================
Converts user's voice to text with very low latency.

Requirements:
pip install SpeechRecognition pyaudio
"""
import logging
import speech_recognition as sr

logger = logging.getLogger("PHI_STT")
recognizer = sr.Recognizer()

def listen_and_transcribe() -> str:
    """
    Listens to the microphone and converts speech to text.
    Handles ambient noise calibration.
    """
    try:
        with sr.Microphone() as source:
            logger.info("Calibrating for ambient noise...")
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            
            logger.info("Listening...")
            # timeout: wait up to 5s for speech to start
            # phrase_time_limit: record for max 15s
            audio = recognizer.listen(source, timeout=5, phrase_time_limit=15)
            
            logger.info("Transcribing...")
            # Using Google STT by default for low-latency online transcription
            text = recognizer.recognize_google(audio)
            logger.info(f"Transcribed: {text}")
            return text
            
    except sr.WaitTimeoutError:
        return ""
    except sr.UnknownValueError:
        logger.warning("Could not understand audio")
        return ""
    except sr.RequestError as e:
        logger.error(f"STT API error: {e}")
        return ""
    except Exception as e:
        logger.error(f"Unexpected STT error: {e}")
        return ""
