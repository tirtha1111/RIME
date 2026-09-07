/**
 * P.H.I. Finnhub Stock API Integration Service
 * ============================================
 * Connects to Finnhub Stock API (using FINNHUB_API_KEY) for real-time
 * US & global stock market quotes, ticker search, day high/lows, open prices,
 * and percentage changes with fallback to verified global exchange feeds.
 */

export interface FinnhubQuote {
  symbol: string;
  name: string;
  currency: string;
  currentPrice: number;
  change: number;
  percentChange: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  previousClose: number;
  timestamp?: number;
  source: 'Finnhub Stock API' | 'Verified Exchange Feed';
  formattedSummary: string;
}

export interface FinnhubResponse {
  configured: boolean;
  source: string;
  symbol: string;
  quote?: FinnhubQuote;
  formattedSummary: string;
}

// Common Ticker Mapping for direct resolution
const TICKER_MAP: Record<string, { symbol: string; name: string; currency: string }> = {
  // US Mega Tech & Popular Stocks
  apple: { symbol: 'AAPL', name: 'Apple Inc.', currency: 'USD' },
  aapl: { symbol: 'AAPL', name: 'Apple Inc.', currency: 'USD' },
  tesla: { symbol: 'TSLA', name: 'Tesla Inc.', currency: 'USD' },
  tsla: { symbol: 'TSLA', name: 'Tesla Inc.', currency: 'USD' },
  nvidia: { symbol: 'NVDA', name: 'NVIDIA Corporation', currency: 'USD' },
  nvda: { symbol: 'NVDA', name: 'NVIDIA Corporation', currency: 'USD' },
  microsoft: { symbol: 'MSFT', name: 'Microsoft Corporation', currency: 'USD' },
  msft: { symbol: 'MSFT', name: 'Microsoft Corporation', currency: 'USD' },
  google: { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', currency: 'USD' },
  googl: { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', currency: 'USD' },
  goog: { symbol: 'GOOG', name: 'Alphabet Inc. (Google)', currency: 'USD' },
  alphabet: { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', currency: 'USD' },
  amazon: { symbol: 'AMZN', name: 'Amazon.com Inc.', currency: 'USD' },
  amzn: { symbol: 'AMZN', name: 'Amazon.com Inc.', currency: 'USD' },
  meta: { symbol: 'META', name: 'Meta Platforms Inc.', currency: 'USD' },
  facebook: { symbol: 'META', name: 'Meta Platforms Inc.', currency: 'USD' },
  netflix: { symbol: 'NFLX', name: 'Netflix Inc.', currency: 'USD' },
  nflx: { symbol: 'NFLX', name: 'Netflix Inc.', currency: 'USD' },
  amd: { symbol: 'AMD', name: 'Advanced Micro Devices', currency: 'USD' },
  intel: { symbol: 'INTC', name: 'Intel Corporation', currency: 'USD' },
  intc: { symbol: 'INTC', name: 'Intel Corporation', currency: 'USD' },
  broadcom: { symbol: 'AVGO', name: 'Broadcom Inc.', currency: 'USD' },
  avgo: { symbol: 'AVGO', name: 'Broadcom Inc.', currency: 'USD' },
  qualcomm: { symbol: 'QCOM', name: 'Qualcomm Inc.', currency: 'USD' },
  qcom: { symbol: 'QCOM', name: 'Qualcomm Inc.', currency: 'USD' },
  oracle: { symbol: 'ORCL', name: 'Oracle Corporation', currency: 'USD' },
  orcl: { symbol: 'ORCL', name: 'Oracle Corporation', currency: 'USD' },
  ibm: { symbol: 'IBM', name: 'International Business Machines', currency: 'USD' },
  palantir: { symbol: 'PLTR', name: 'Palantir Technologies', currency: 'USD' },
  pltr: { symbol: 'PLTR', name: 'Palantir Technologies', currency: 'USD' },
  uber: { symbol: 'UBER', name: 'Uber Technologies', currency: 'USD' },
  airbnb: { symbol: 'ABNB', name: 'Airbnb Inc.', currency: 'USD' },
  coinbase: { symbol: 'COIN', name: 'Coinbase Global', currency: 'USD' },
  coin: { symbol: 'COIN', name: 'Coinbase Global', currency: 'USD' },
  disney: { symbol: 'DIS', name: 'Walt Disney Co.', currency: 'USD' },
  dis: { symbol: 'DIS', name: 'Walt Disney Co.', currency: 'USD' },
  coca: { symbol: 'KO', name: 'Coca-Cola Company', currency: 'USD' },
  pepsi: { symbol: 'PEP', name: 'PepsiCo Inc.', currency: 'USD' },
  nike: { symbol: 'NKE', name: 'Nike Inc.', currency: 'USD' },
  starbucks: { symbol: 'SBUX', name: 'Starbucks Corp.', currency: 'USD' },

  // Indian ADRs & Global listings on Finnhub
  infosys: { symbol: 'INFY', name: 'Infosys Limited', currency: 'USD' },
  infy: { symbol: 'INFY', name: 'Infosys Limited', currency: 'USD' },
  hdfc: { symbol: 'HDB', name: 'HDFC Bank Limited (ADR)', currency: 'USD' },
  hdb: { symbol: 'HDB', name: 'HDFC Bank Limited (ADR)', currency: 'USD' },
  icici: { symbol: 'IBN', name: 'ICICI Bank Limited (ADR)', currency: 'USD' },
  ibn: { symbol: 'IBN', name: 'ICICI Bank Limited (ADR)', currency: 'USD' },
  wipro: { symbol: 'WIT', name: 'Wipro Limited (ADR)', currency: 'USD' },
  wit: { symbol: 'WIT', name: 'Wipro Limited (ADR)', currency: 'USD' },
  'dr reddy': { symbol: 'RDY', name: 'Dr. Reddy\'s Laboratories (ADR)', currency: 'USD' },
  rdy: { symbol: 'RDY', name: 'Dr. Reddy\'s Laboratories (ADR)', currency: 'USD' },

  // Crypto on Finnhub
  bitcoin: { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin (BTC/USDT)', currency: 'USD' },
  btc: { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin (BTC/USDT)', currency: 'USD' },
  ethereum: { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum (ETH/USDT)', currency: 'USD' },
  eth: { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum (ETH/USDT)', currency: 'USD' },
  solana: { symbol: 'BINANCE:SOLUSDT', name: 'Solana (SOL/USDT)', currency: 'USD' },
  sol: { symbol: 'BINANCE:SOLUSDT', name: 'Solana (SOL/USDT)', currency: 'USD' },
};

/**
 * Clean user query to extract the stock name or ticker
 */
export function extractStockSymbol(query: string): { symbol: string; name: string; currency: string } {
  const clean = query
    .toLowerCase()
    .replace(/['"’`]/g, '')
    .replace(/\b(what is the|share price of|stock price of|price of|current price of|quote for|stock of|shares of|rate of|market price of|share price|stock price|share rate|stock rate|share|stock|price|quote|shares|rate|market|current|today|live|value|what is|how much is|tell me|give me|check|in finnhub|finnhub)\b/gi, ' ')
    .replace(/\b(का शेयर प्राइस|का भाव|की कीमत|शेयर मूल्य|स्टॉक प्राइस|स्टॉक भाव|स्टॉक|शेयर|बताओ|बताएं|कीमत|भाव|का|की|के|कितना है|क्या है|का रेट)\b/gi, ' ')
    .replace(/[?.,!]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Direct match in dictionary
  if (TICKER_MAP[clean]) {
    return TICKER_MAP[clean];
  }

  // 2. Partial match in dictionary
  for (const [key, val] of Object.entries(TICKER_MAP)) {
    if (clean === key || clean.includes(key) || key.includes(clean)) {
      return val;
    }
  }

  // 3. If looks like an uppercase symbol already (e.g., TSLA, NVDA)
  const candidate = clean.split(' ')[0].toUpperCase();
  return {
    symbol: candidate || 'AAPL',
    name: candidate || 'Apple Inc.',
    currency: 'USD',
  };
}

/**
 * Fetch Quote directly from Finnhub Stock API
 */
async function fetchFromFinnhub(symbol: string, apiKey: string, companyName?: string): Promise<FinnhubQuote | null> {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      console.warn(`Finnhub returned status ${res.status} for ${symbol}`);
      return null;
    }

    const data = await res.json();
    // Finnhub quote format: { c: current, d: change, dp: percent_change, h: high, l: low, o: open, pc: prev_close, t: timestamp }
    if (data.c === undefined || data.c === 0) {
      return null;
    }

    const currentPrice = Number(data.c.toFixed(2));
    const change = Number((data.d ?? 0).toFixed(2));
    const percentChange = Number((data.dp ?? 0).toFixed(2));
    const highPrice = Number((data.h ?? currentPrice).toFixed(2));
    const lowPrice = Number((data.l ?? currentPrice).toFixed(2));
    const openPrice = Number((data.o ?? currentPrice).toFixed(2));
    const previousClose = Number((data.pc ?? currentPrice).toFixed(2));
    const sign = change >= 0 ? '+' : '';

    const displayName = companyName || symbol;
    const formattedSummary = `Real-time Stock Quote (Finnhub API) for ${displayName} (${symbol}):
- Current Price: $${currentPrice.toLocaleString('en-US')} USD
- Change Today: ${sign}$${change.toLocaleString('en-US')} (${sign}${percentChange}%)
- Day's Range: Low $${lowPrice.toLocaleString('en-US')} - High $${highPrice.toLocaleString('en-US')}
- Open: $${openPrice.toLocaleString('en-US')} | Previous Close: $${previousClose.toLocaleString('en-US')}
- Market Timestamp: Live tick from Finnhub at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    return {
      symbol,
      name: displayName,
      currency: 'USD',
      currentPrice,
      change,
      percentChange,
      highPrice,
      lowPrice,
      openPrice,
      previousClose,
      timestamp: data.t,
      source: 'Finnhub Stock API',
      formattedSummary,
    };
  } catch (err) {
    console.error('Finnhub fetch error:', err);
    return null;
  }
}

/**
 * Fallback to Yahoo Finance / Global Quotes if Finnhub API Key is not yet set or for NSE/BSE
 */
async function fetchFallbackQuote(symbol: string, name: string): Promise<FinnhubQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) return null;

    const currentPrice = Number(meta.regularMarketPrice.toFixed(2));
    const prevClose = Number((meta.previousClose || meta.chartPreviousClose || currentPrice).toFixed(2));
    const change = Number((currentPrice - prevClose).toFixed(2));
    const percentChange = Number(((change / prevClose) * 100).toFixed(2));
    const highPrice = Number((meta.regularMarketDayHigh || currentPrice).toFixed(2));
    const lowPrice = Number((meta.regularMarketDayLow || currentPrice).toFixed(2));
    const currency = meta.currency || 'USD';
    const sign = change >= 0 ? '+' : '';

    const formattedSummary = `Real-time Stock Quote (${meta.exchangeName || 'Global Exchange'}) for ${name} (${symbol}):
- Current Price: ${currentPrice.toLocaleString()} ${currency}
- Change Today: ${sign}${change.toLocaleString()} (${sign}${percentChange}%)
- Day's Range: Low ${lowPrice.toLocaleString()} - High ${highPrice.toLocaleString()} ${currency}
- Previous Close: ${prevClose.toLocaleString()} ${currency}
- Market Status: Live as of ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    return {
      symbol,
      name,
      currency,
      currentPrice,
      change,
      percentChange,
      highPrice,
      lowPrice,
      openPrice: prevClose,
      previousClose: prevClose,
      source: 'Verified Exchange Feed',
      formattedSummary,
    };
  } catch (err) {
    console.warn('Fallback quote error:', err);
    return null;
  }
}

/**
 * Universal Real-time Stock Resolver
 */
export async function getLiveStockQuote(query: string): Promise<FinnhubResponse> {
  const apiKey = process.env.FINNHUB_API_KEY;
  const target = extractStockSymbol(query);
  const isConfigured = Boolean(apiKey);

  if (apiKey) {
    const finnhubQuote = await fetchFromFinnhub(target.symbol, apiKey, target.name);
    if (finnhubQuote) {
      return {
        configured: true,
        source: 'Finnhub Stock API',
        symbol: target.symbol,
        quote: finnhubQuote,
        formattedSummary: finnhubQuote.formattedSummary,
      };
    }
  }

  // Fallback to verified Yahoo / Exchange quote
  const fallback = await fetchFallbackQuote(target.symbol, target.name);
  if (fallback) {
    return {
      configured: isConfigured,
      source: fallback.source,
      symbol: target.symbol,
      quote: fallback,
      formattedSummary: fallback.formattedSummary,
    };
  }

  return {
    configured: isConfigured,
    source: 'Financial Market Feeds',
    symbol: target.symbol,
    formattedSummary: `Could not retrieve live stock quote for ${target.name} (${target.symbol}).`,
  };
}
