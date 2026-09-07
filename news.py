"""
P.H.I. News API Module
======================
Connects to NewsAPI.org using NEWS_API_KEY with query/category filters
and provides structured summaries for voice synthesis.
"""

import os
import logging
import urllib.request
import urllib.parse
import json
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("PHI_News")

NEWS_API_KEY = os.getenv("NEWS_API_KEY")

def get_live_news(topic: str = "", category: str = "", country: str = "in", page_size: int = 5) -> str:
    """
    Fetches real-time headlines from NewsAPI.org or fallback news sources.
    """
    api_key = os.getenv("NEWS_API_KEY") or NEWS_API_KEY
    
    if not api_key:
        logger.warning("NEWS_API_KEY is not set in environment.")
        return "News API key is not configured. Please add NEWS_API_KEY in your settings."

    try:
        if topic and len(topic.strip()) > 1:
            params = {
                'q': topic.strip(),
                'sortBy': 'publishedAt',
                'pageSize': page_size,
                'language': 'en',
                'apiKey': api_key
            }
            url = f"https://newsapi.org/v2/everything?{urllib.parse.urlencode(params)}"
        else:
            params = {
                'country': country or 'in',
                'pageSize': page_size,
                'apiKey': api_key
            }
            if category:
                params['category'] = category
            url = f"https://newsapi.org/v2/top-headlines?{urllib.parse.urlencode(params)}"

        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'PHI-AI-Voice-Assistant/2.0'}
        )

        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status != 200:
                return f"NewsAPI returned status code {response.status}"
            data = json.loads(response.read().decode('utf-8'))

        articles = data.get('articles', [])
        if not articles:
            return "No recent news articles found for that topic."

        bulletin_lines = []
        for idx, art in enumerate(articles[:page_size], 1):
            title = art.get('title', 'Headline')
            source = art.get('source', {}).get('name', 'News Source')
            desc = art.get('description', '') or ''
            bulletin_lines.append(f"{idx}. [{source}] {title} - {desc[:140]}")

        return "\n".join(bulletin_lines)

    except Exception as e:
        logger.error(f"Failed to fetch news from NewsAPI: {e}")
        return f"Unable to fetch news at this time: {str(e)}"

if __name__ == "__main__":
    print("Testing News API...")
    news_output = get_live_news(topic="technology")
    print(news_output)
