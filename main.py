"""
P.H.I. Voice Assistant - Main Loop
==================================

DATA FLOW:
1. MIC -> STT: Captures audio from the microphone and transcribes it to text.
2. TEXT -> ROUTER: Routes through intelligent grounding (News, Weather, Finnhub, Wikipedia) and Gemini LLM.
3. ROUTER -> DISPATCH: Generates conversational, grounded answer.
4. DISPATCH -> TTS: Converts the final text response back into speech.
5. TTS -> SPEAKER: Plays the audio to the user.
6. LOOP: Returns to listening.

REQUIREMENTS:
pip install SpeechRecognition pyaudio pyttsx3 python-dotenv
"""

import os
import sys
import logging
from typing import Optional
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("PHI_Main")

# Load environment variables
load_dotenv()

# ==========================================
# IMPORTS FROM YOUR MODULES
# ==========================================
try:
    from chatbot import get_chatbot_response
except ImportError:
    logger.warning("chatbot.py not found in current directory. Using fallback get_chatbot_response.")
    def get_chatbot_response(query: str) -> str:
        return f"Response to: {query}"


# ==========================================
# CONFIGURATION FLAGS
# ==========================================
USE_FASTER_WHISPER = False  
USE_EDGE_TTS = False        

# ==========================================
# INITIALIZE STT & TTS ENGINES
# ==========================================
import speech_recognition as sr
recognizer = sr.Recognizer()

if USE_FASTER_WHISPER:
    try:
        from faster_whisper import WhisperModel
        whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
        logger.info("faster-whisper model loaded.")
    except ImportError:
        logger.error("faster-whisper not installed. Falling back to Google STT.")
        USE_FASTER_WHISPER = False

if not USE_EDGE_TTS:
    try:
        import pyttsx3
        tts_engine = pyttsx3.init()
        tts_engine.setProperty('rate', 170)
    except ImportError:
        logger.error("pyttsx3 not installed.")
        tts_engine = None


# ==========================================
# CORE FUNCTIONS
# ==========================================

def listen_and_transcribe(mic: sr.Microphone) -> Optional[str]:
    """
    Listens to the microphone and converts speech to text.
    Handles ambient noise calibration and timeouts gracefully.
    """
    logger.info("Listening...")
    with mic as source:
        recognizer.adjust_for_ambient_noise(source, duration=0.5)
        try:
            audio = recognizer.listen(source, timeout=5, phrase_time_limit=15)
        except sr.WaitTimeoutError:
            return None

    logger.info("Processing audio...")
    try:
        if USE_FASTER_WHISPER:
            with open("temp_audio.wav", "wb") as f:
                f.write(audio.get_wav_data())
            segments, _ = whisper_model.transcribe("temp_audio.wav", beam_size=5)
            transcription = " ".join([segment.text for segment in segments]).strip()
            if os.path.exists("temp_audio.wav"):
                os.remove("temp_audio.wav")
            return transcription
        else:
            transcription = recognizer.recognize_google(audio)
            return transcription
    except sr.UnknownValueError:
        logger.warning("STT could not understand audio.")
        return None
    except sr.RequestError as e:
        logger.error(f"Could not request results from STT service: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error in STT: {e}")
        return None


def speak(text: str) -> None:
    """
    Converts text to speech and plays it through the speakers.
    """
    if not text:
        return
        
    logger.info(f"P.H.I. says: {text}")
    
    if USE_EDGE_TTS:
        try:
            import subprocess
            subprocess.run(['edge-tts', '--text', text, '--voice', 'en-US-AriaNeural', '--play-audio'], check=True)
        except Exception as e:
            logger.error(f"Edge-TTS failed: {e}. Ensure edge-tts and mpv are installed.")
    else:
        if tts_engine:
            tts_engine.say(text)
            tts_engine.runAndWait()
        else:
            logger.error("TTS Engine not initialized. Cannot speak.")


def route_query(query: str) -> str:
    """
    Central function that dispatches the query directly to P.H.I.'s intelligent brain
    and returns the final natural text to be spoken.
    """
    logger.info("Executing voice response generation...")
    final_answer = get_chatbot_response(query)
    return final_answer


# ==========================================
# MAIN LOOP
# ==========================================

def main():
    logger.info("Initializing P.H.I. Voice Assistant...")
    
    try:
        mic = sr.Microphone()
    except Exception as e:
        logger.error(f"Could not initialize microphone: {e}. Are PyAudio and audio drivers installed?")
        return
    
    speak("Hello! P.H.I. system is now online and ready.")
    
    while True:
        try:
            # 1. LISTEN
            query = listen_and_transcribe(mic)
            
            if not query:
                continue
                
            logger.info(f"User said: {query}")
            
            # Check for exit commands
            lower_query = query.lower().strip()
            clean_query = ''.join(c for c in lower_query if c.isalnum() or c.isspace())
            if clean_query in ["exit", "stop", "quit", "goodbye", "shut down"]:
                speak("Goodbye! Shutting down.")
                logger.info("Exit command received. Terminating.")
                break
                
            # 2 & 3. ROUTE & DISPATCH
            response_text = route_query(query)
            
            # 4. SPEAK
            speak(response_text)
            
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received. Terminating loop.")
            speak("Goodbye.")
            break
        except Exception as e:
            logger.error(f"Critical error in main loop: {e}", exc_info=True)
            speak("Sorry, I encountered an unexpected error.")

if __name__ == "__main__":
    main()
