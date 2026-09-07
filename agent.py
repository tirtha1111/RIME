"""
LiveKit Voice AI Agent - PHI AI
================================
Implements LiveKit's latest Voice Agent Architecture (2025/2026) using
the new Multimodal Realtime Model (gpt-realtime-2.1) and high-speed
streaming Voice Pipeline (Deepgram Nova-3 + Groq LPU + Rime Voice Coda TTS).

REQUIREMENTS:
pip install livekit-agents livekit-plugins-openai livekit-plugins-deepgram livekit-plugins-groq livekit-plugins-rime livekit-plugins-silero python-dotenv requests

RUNNING THE AGENT:
python agent.py dev
"""

import os
import sys
import logging
import asyncio
from typing import Annotated
from dotenv import load_dotenv

load_dotenv()

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("PHI_LiveKit_Agent")

# Model configuration
AGENT_MODE = os.getenv("LIVEKIT_AGENT_MODE", "realtime")  # 'realtime' or 'pipeline'
REALTIME_MODEL = os.getenv("LIVEKIT_REALTIME_MODEL", "gpt-realtime-2.1")
LLM_MODEL = os.getenv("LIVEKIT_LLM_MODEL", "llama-3.3-70b-versatile")
STT_MODEL = os.getenv("LIVEKIT_STT_MODEL", "nova-3")
TTS_MODEL = os.getenv("LIVEKIT_TTS_MODEL", "coda")


# ==========================================
# TOOL FUNCTIONS (Real-time Functions)
# ==========================================

async def get_live_weather(location: str) -> str:
    """Get current real-time weather and temperature for a given city or location."""
    import urllib.parse
    import urllib.request
    import json
    
    clean_loc = location.strip()
    try:
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(clean_loc)}&count=1&language=en&format=json"
        req = urllib.request.Request(geo_url, headers={"User-Agent": "LiveKitAgent/1.0"})
        with urllib.request.urlopen(req, timeout=4) as response:
            geo_data = json.loads(response.read().decode())
            results = geo_data.get("results")
            if not results:
                return f"Could not find coordinates for {location}."
            loc = results[0]
            lat, lon = loc["latitude"], loc["longitude"]
            city_name = loc.get("name", location)
            country = loc.get("country", "")

        w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m"
        req = urllib.request.Request(w_url, headers={"User-Agent": "LiveKitAgent/1.0"})
        with urllib.request.urlopen(req, timeout=4) as response:
            w_data = json.loads(response.read().decode())
            curr = w_data.get("current", {})
            temp_c = curr.get("temperature_2m")
            feels_c = curr.get("apparent_temperature")
            humidity = curr.get("relative_humidity_2m")
            wind = curr.get("wind_speed_10m")
            return f"Weather in {city_name}, {country}: {temp_c}°C (feels like {feels_c}°C), humidity {humidity}%, wind speed {wind} km/h."
    except Exception as e:
        logger.error(f"Weather fetch failed: {e}")
        return f"Weather data currently unavailable for {location}."


async def get_stock_price(ticker_or_company: str) -> str:
    """Get real-time stock price and market performance for a given ticker or company name."""
    import urllib.parse
    import urllib.request
    import json

    symbol = ticker_or_company.upper().strip()
    if "EXIDE" in symbol:
        symbol = "EXIDEIND.NS"
    elif "TATA MOTOR" in symbol:
        symbol = "TMCV.NS"
    elif "RELIANCE" in symbol:
        symbol = "RELIANCE.NS"
    elif "NIFTY" in symbol:
        symbol = "^NSEI"

    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            meta = data.get("chart", {}).get("result", [{}])[0].get("meta", {})
            price = meta.get("regularMarketPrice")
            currency = meta.get("currency", "USD")
            prev_close = meta.get("previousClose")
            name = meta.get("shortName") or meta.get("symbol") or symbol
            if price is not None:
                change_str = ""
                if prev_close:
                    diff = price - prev_close
                    pct = (diff / prev_close) * 100
                    change_str = f" ({diff:+.2f} / {pct:+.2f}%)"
                return f"{name} is trading at {price} {currency}{change_str}."
    except Exception as e:
        logger.error(f"Stock fetch failed: {e}")
    return f"Live stock price unavailable for {ticker_or_company}."


# ==========================================
# LIVEKIT AGENT INITIALIZATION
# ==========================================

async def entrypoint_realtime(ctx):
    """
    LiveKit Multimodal Realtime Agent (e.g. gpt-realtime-2.1 / gpt-4o-realtime).
    Direct speech-to-speech with ultra-low latency & full interruption handling.
    """
    try:
        from livekit.agents import JobContext, WorkerOptions, cli
        from livekit.agents.multimodal import MultimodalAgent
        from livekit.plugins import openai
    except ImportError:
        logger.error("LiveKit agent libraries not fully installed. Install livekit-agents livekit-plugins-openai")
        return

    logger.info(f"Connecting to room {ctx.room.name} with Multimodal Realtime model {REALTIME_MODEL}...")
    await ctx.connect()

    # Define tool functions for the model
    tools = [
        openai.realtime.FunctionTool(
            name="get_live_weather",
            description="Get current weather for any location.",
            parameters={
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City or location name"}
                },
                "required": ["location"],
            },
            fn=get_live_weather,
        ),
        openai.realtime.FunctionTool(
            name="get_stock_price",
            description="Get current live stock market price for a company or ticker.",
            parameters={
                "type": "object",
                "properties": {
                    "ticker_or_company": {"type": "string", "description": "Company name or ticker symbol (e.g. Exide, Tata Motors, Apple)"}
                },
                "required": ["ticker_or_company"],
            },
            fn=get_stock_price,
        ),
    ]

    model = openai.realtime.RealtimeModel(
        model=REALTIME_MODEL,
        instructions=(
            "You are PHI AI, a high-speed, helpful, concise, and friendly voice assistant. "
            "Respond naturally in 1-2 spoken sentences. Avoid markdown or emojis in voice responses."
        ),
        voice="alloy",
        temperature=0.6,
        modalities=["audio", "text"],
        turn_detection=openai.realtime.ServerVAD(
            threshold=0.5,
            prefix_padding_ms=300,
            silence_duration_ms=500
        ),
    )

    agent = MultimodalAgent(model=model, tools=tools)
    agent.start(ctx.room)

    logger.info("PHI AI LiveKit Realtime Agent is live and ready.")


async def entrypoint_pipeline(ctx):
    """
    LiveKit Pipeline Agent (Deepgram Nova-3 STT + Groq LLM + Rime Voice TTS + Silero VAD).
    """
    try:
        from livekit.agents import JobContext, WorkerOptions, cli
        from livekit.agents.pipeline import VoicePipelineAgent
        from livekit.plugins import deepgram, groq, rime, silero
    except ImportError:
        logger.error("LiveKit pipeline libraries not fully installed.")
        return

    logger.info(f"Connecting to room {ctx.room.name} with Pipeline Agent (STT: {STT_MODEL}, LLM: {LLM_MODEL}, TTS: {TTS_MODEL})...")
    await ctx.connect()

    stt = deepgram.STT(model=STT_MODEL)
    llm = groq.LLM(model=LLM_MODEL)
    tts = rime.TTS(model=TTS_MODEL, speaker="coda")
    vad = silero.VAD.load()

    agent = VoicePipelineAgent(
        vad=vad,
        stt=stt,
        llm=llm,
        tts=tts,
        chat_ctx=(
            "You are PHI AI, a super fast, intelligent voice assistant. Keep answers concise, clear, and natural."
        ),
    )

    agent.start(ctx.room)
    logger.info("PHI AI LiveKit Pipeline Agent is live and ready.")


def main():
    try:
        from livekit.agents import WorkerOptions, cli
    except ImportError:
        print("\n========================================================")
        print("LiveKit Agents SDK is not yet installed in this environment.")
        print("To run the LiveKit Python agent, execute:")
        print("  pip install livekit-agents livekit-plugins-openai livekit-plugins-deepgram livekit-plugins-groq livekit-plugins-rime livekit-plugins-silero")
        print("Then run:")
        print("  python agent.py dev")
        print("========================================================\n")
        return

    target_entrypoint = entrypoint_realtime if AGENT_MODE == "realtime" else entrypoint_pipeline
    cli.run_app(WorkerOptions(entrypoint_fnc=target_entrypoint))


if __name__ == "__main__":
    main()
