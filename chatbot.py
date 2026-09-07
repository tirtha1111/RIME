"""
P.H.I. Chatbot Module
=====================
Handles conversational queries with real-time news, weather, stock quotes & Wikipedia factual grounding.
"""
import logging
from model import get_llm_response
from news import get_live_news
from weather import get_live_weather
from wikipedia_module import search_wikipedia
from finnhub_module import get_live_stock_quote

logger = logging.getLogger("PHI_Chatbot")

def get_chatbot_response(query: str) -> str:
    """
    Generates a response for conversational queries using the language model,
    grounded with live News API, OpenWeatherMap, Finnhub Stocks, and Wikipedia feeds.
    """
    logger.info(f"Generating chatbot response for: {query}")
    
    q_lower = query.lower()
    news_keywords = ['news', 'headline', 'headlines', 'breaking news', 'top stories', 'समाचार', 'खबरें', 'ताज़ा खबर']
    weather_keywords = ['weather', 'temperature', 'forecast', 'climate', 'rain', 'मौसम', 'तापमान', 'बारिश', 'धूप', 'ठंड', 'गर्मी']
    stock_keywords = ['stock', 'share price', 'shares', 'price of apple', 'price of tesla', 'nvidia stock', 'शेयर', 'स्टॉक', 'मार्केट']
    factual_keywords = ['what is', 'who is', 'who was', 'where is', 'tell me about', 'explain', 'history of', 'how does', 'definition', 'क्या है', 'किसे कहते हैं', 'का इतिहास']
    
    grounding_context = ""
    if any(k in q_lower for k in news_keywords):
        logger.info("News intent detected, querying News API...")
        news_data = get_live_news(topic=query if ('about' in q_lower or 'on' in q_lower) else "")
        grounding_context += f"\n\n[LIVE NEWS BULLETIN FROM NEWS API]:\n{news_data}\n"

    elif any(k in q_lower for k in weather_keywords):
        logger.info("Weather intent detected, querying OpenWeatherMap API...")
        weather_data = get_live_weather(query)
        grounding_context += f"\n\n[LIVE WEATHER REPORT FROM OPENWEATHERMAP]:\n{weather_data}\n"

    elif any(k in q_lower for k in stock_keywords):
        logger.info("Stock market intent detected, querying Finnhub API...")
        stock_data = get_live_stock_quote(query)
        grounding_context += f"\n\n[LIVE STOCK DATA FROM FINNHUB API]:\n{stock_data}\n"

    elif any(k in q_lower for k in factual_keywords):
        logger.info("Factual question detected, querying Wikipedia...")
        wiki_lang = "hi" if any('\u0900' <= char <= '\u097f' for char in query) else "en"
        wiki_data = search_wikipedia(query, lang=wiki_lang)
        if wiki_data:
            grounding_context += f"\n\n[VERIFIED WIKIPEDIA KNOWLEDGE]:\n{wiki_data}\n"
    
    # Define a persona for the chatbot responses
    system_prompt = "You are P.H.I., a helpful, intelligent, and concise voice assistant with a friendly, male persona. Give natural, concise, and factual conversational responses suitable for speaking aloud."
    prompt = f"{grounding_context}Answer the following query concisely and conversationally:\n\nUser: {query}\nP.H.I:"
    
    return get_llm_response(prompt, system_prompt=system_prompt)

