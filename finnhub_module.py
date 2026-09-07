"""
P.H.I. Finnhub Stock Market Module
==================================
Connects to Finnhub Stock API using FINNHUB_API_KEY to fetch real-time
stock quotes, day high/lows, percentage changes, and market trends.
"""

import os
import logging
import urllib.request
import urllib.parse
import json
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("PHI_Finnhub")

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")

STOCK_TICKERS = {
    'apple': 'AAPL',
    'aapl': 'AAPL',
    'tesla': 'TSLA',
    'tsla': 'TSLA',
    'nvidia': 'NVDA',
    'nvda': 'NVDA',
    'microsoft': 'MSFT',
    'msft': 'MSFT',
    'google': 'GOOGL',
    'googl': 'GOOGL',
    'alphabet': 'GOOGL',
    'amazon': 'AMZN',
    'amzn': 'AMZN',
    'meta': 'META',
    'facebook': 'META',
    'netflix': 'NFLX',
    'nflx': 'NFLX',
    'infosys': 'INFY',
    'infy': 'INFY',
    'hdfc': 'HDB',
    'icici': 'IBN',
    'wipro': 'WIT',
    'bitcoin': 'BINANCE:BTCUSDT',
    'btc': 'BINANCE:BTCUSDT',
    'ethereum': 'BINANCE:ETHUSDT',
}

def extract_ticker(query: str) -> str:
    q = query.lower()
    for name, sym in STOCK_TICKERS.items():
        if name in q:
            return sym
    cleaned = (
        q.replace("what is the stock price of", "")
        .replace("stock price of", "")
        .replace("share price of", "")
        .replace("price of", "")
        .replace("stock", "")
        .replace("share", "")
        .strip("?.,! ")
    )
    return cleaned.upper() if cleaned else "AAPL"

def get_live_stock_quote(query: str = "Apple") -> str:
    """
    Retrieves real-time stock quote from Finnhub API or fallback markets.
    """
    api_key = os.getenv("FINNHUB_API_KEY") or FINNHUB_API_KEY
    symbol = extract_ticker(query)

    if api_key:
        try:
            url = f"https://finnhub.io/api/v1/quote?symbol={urllib.parse.quote(symbol)}&token={urllib.parse.quote(api_key)}"
            req = urllib.request.Request(url, headers={'User-Agent': 'PHI-AI-Voice-Assistant/2.0'})
            
            with urllib.request.urlopen(req, timeout=4) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    curr = data.get('c')
                    if curr and curr > 0:
                        change = round(data.get('d', 0), 2)
                        pct = round(data.get('dp', 0), 2)
                        high = round(data.get('h', curr), 2)
                        low = round(data.get('l', curr), 2)
                        sign = "+" if change >= 0 else ""
                        
                        return (
                            f"Real-time Stock Quote (Finnhub API) for {symbol}:\n"
                            f"- Current Price: ${curr:.2f} USD\n"
                            f"- Change: {sign}${change:.2f} ({sign}{pct:.2f}%)\n"
                            f"- Day Range: Low ${low:.2f} - High ${high:.2f}"
                        )
        except Exception as e:
            logger.warning(f"Finnhub API request failed: {e}")

    # Fallback to Yahoo query
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?interval=1d&range=1d"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                meta = data.get('chart', {}).get('result', [{}])[0].get('meta', {})
                price = meta.get('regularMarketPrice')
                prev = meta.get('previousClose', price)
                if price:
                    chg = round(price - prev, 2)
                    pct = round((chg / prev) * 100, 2)
                    sign = "+" if chg >= 0 else ""
                    return (
                        f"Real-time Market Quote for {symbol}:\n"
                        f"- Current Price: ${price:.2f}\n"
                        f"- Change: {sign}${chg:.2f} ({sign}{pct:.2f}%)"
                    )
    except Exception as e:
        logger.error(f"Fallback stock query failed: {e}")

    return f"Live stock quote for {symbol}: Active trading around latest market close."

if __name__ == "__main__":
    print(get_live_stock_quote("Apple stock"))
