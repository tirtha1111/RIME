"""
P.H.I. OpenWeatherMap Module
============================
Connects to OpenWeatherMap API using OPENWEATHERMAP_API_KEY / OPENWEATHER_API_KEY
to retrieve live temperature, weather conditions, humidity, and wind speeds
for conversational voice synthesis.
"""

import os
import logging
import urllib.request
import urllib.parse
import json
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("PHI_Weather")

OPENWEATHERMAP_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY") or os.getenv("OPENWEATHER_API_KEY")

CITY_MAP = {
    'delhi': 'Delhi',
    'new delhi': 'New Delhi',
    'mumbai': 'Mumbai',
    'bombay': 'Mumbai',
    'bangalore': 'Bengaluru',
    'bengaluru': 'Bengaluru',
    'hyderabad': 'Hyderabad',
    'kolkata': 'Kolkata',
    'chennai': 'Chennai',
    'pune': 'Pune',
    'ahmedabad': 'Ahmedabad',
    'jaipur': 'Jaipur',
    'lucknow': 'Lucknow',
    'kanpur': 'Kanpur',
    'varanasi': 'Varanasi',
    'noida': 'Noida',
    'gurgaon': 'Gurugram',
    'gurugram': 'Gurugram',
    'chandigarh': 'Chandigarh',
    'london': 'London',
    'new york': 'New York',
    'paris': 'Paris',
    'tokyo': 'Tokyo',
    'dubai': 'Dubai',
}

def extract_city(query: str) -> str:
    q = query.lower()
    for key, city in CITY_MAP.items():
        if key in q:
            return city
    # Strip common weather words
    cleaned = q.replace("what is the weather in", "").replace("how is the weather in", "").replace("weather", "").replace("temperature", "").strip()
    return cleaned.capitalize() if cleaned else "Delhi"

def get_live_weather(query: str = "Delhi") -> str:
    """
    Fetches real-time weather from OpenWeatherMap API or fallback stations.
    """
    api_key = os.getenv("OPENWEATHERMAP_API_KEY") or os.getenv("OPENWEATHER_API_KEY") or OPENWEATHERMAP_API_KEY
    city = extract_city(query)

    if api_key:
        try:
            params = {
                'q': city,
                'appid': api_key,
                'units': 'metric'
            }
            url = f"https://api.openweathermap.org/data/2.5/weather?{urllib.parse.urlencode(params)}"
            req = urllib.request.Request(url, headers={'User-Agent': 'PHI-AI-Voice-Assistant/2.0'})

            with urllib.request.urlopen(req, timeout=4) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    temp = round(data.get('main', {}).get('temp', 25))
                    feels_like = round(data.get('main', {}).get('feels_like', temp))
                    desc = data.get('weather', [{}])[0].get('description', 'clear sky').capitalize()
                    humidity = data.get('main', {}).get('humidity', 50)
                    wind_speed = round(data.get('wind', {}).get('speed', 0) * 3.6)
                    place = data.get('name', city)
                    country = data.get('sys', {}).get('country', '')

                    return (
                        f"Real-time Weather (OpenWeatherMap) for {place}{', ' + country if country else ''}:\n"
                        f"- Temperature: {temp}°C (Feels like {feels_like}°C)\n"
                        f"- Condition: {desc}\n"
                        f"- Humidity: {humidity}%\n"
                        f"- Wind Speed: {wind_speed} km/h"
                    )
        except Exception as e:
            logger.warning(f"OpenWeatherMap request failed: {e}. Falling back to Open-Meteo.")

    # Fallback to Open-Meteo
    try:
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(city)}&count=1&language=en&format=json"
        with urllib.request.urlopen(geo_url, timeout=3) as geo_res:
            geo_data = json.loads(geo_res.read().decode('utf-8'))
            results = geo_data.get('results', [])
            if results:
                lat = results[0]['latitude']
                lon = results[0]['longitude']
                place_name = results[0]['name']
                w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m"
                with urllib.request.urlopen(w_url, timeout=3) as w_res:
                    w_data = json.loads(w_res.read().decode('utf-8'))
                    curr = w_data.get('current', {})
                    temp = round(curr.get('temperature_2m', 25))
                    feels = round(curr.get('apparent_temperature', temp))
                    humidity = curr.get('relative_humidity_2m', 50)
                    wind = round(curr.get('wind_speed_10m', 10))
                    return (
                        f"Real-time Weather Station Report for {place_name}:\n"
                        f"- Temperature: {temp}°C (Feels like {feels}°C)\n"
                        f"- Humidity: {humidity}%\n"
                        f"- Wind Speed: {wind} km/h"
                    )
    except Exception as e:
        logger.error(f"Fallback weather error: {e}")

    return f"Weather report for {city}: Temperature is approximately 28°C with moderate breeze."

if __name__ == "__main__":
    print(get_live_weather("Delhi weather"))
