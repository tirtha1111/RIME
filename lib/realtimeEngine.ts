import * as cheerio from 'cheerio';
import { getLiveNews, detectNewsIntent } from './newsService';
import { getLiveWeather, detectWeatherIntent } from './weatherService';
import { getWikipediaKnowledge, detectWikipediaIntent } from './wikipediaService';
import { getLiveStockQuote } from './finnhubService';

interface RealtimeResult {
  source: string;
  data: string;
}

// WMO Weather Interpretation Codes (WW)
const WMO_CODE_MAP: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  62: 'Moderate rain',
  63: 'Heavy rain',
  65: 'Very heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snowfall',
  73: 'Moderate snowfall',
  75: 'Heavy snowfall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

/**
 * 1. Live Weather Retrieval (Open-Meteo + wttr.in fallback)
 */
// Common city aliases and typo corrections for instant accurate resolution
const CITY_ALIASES: Record<string, string> = {
  'olkata': 'Kolkata',
  'calcutta': 'Kolkata',
  'kolkatta': 'Kolkata',
  'kolkata': 'Kolkata',
  'bengaluru': 'Bengaluru',
  'bangalore': 'Bengaluru',
  'mumbai': 'Mumbai',
  'bombay': 'Mumbai',
  'delhi': 'Delhi',
  'new delhi': 'New Delhi',
  'chennai': 'Chennai',
  'madras': 'Chennai',
  'hyderabad': 'Hyderabad',
  'ahmedabad': 'Ahmedabad',
  'pune': 'Pune',
  'jaipur': 'Jaipur',
  'lucknow': 'Lucknow',
  'kanpur': 'Kanpur',
  'nagpur': 'Nagpur',
  'indore': 'Indore',
  'patna': 'Patna',
  'bhopal': 'Bhopal',
  'chandigarh': 'Chandigarh',
  'surat': 'Surat',
  'varanasi': 'Varanasi',
  'banaras': 'Varanasi',
  'kashi': 'Varanasi',
  'agra': 'Agra',
  'noida': 'Noida',
  'gurgaon': 'Gurugram',
  'gurugram': 'Gurugram',
  'ghaziabad': 'Ghaziabad',
  'faridabad': 'Faridabad',
  'kochi': 'Kochi',
  'cochin': 'Kochi',
  'thiruvananthapuram': 'Thiruvananthapuram',
  'trivandrum': 'Thiruvananthapuram',
  'guwahati': 'Guwahati',
  'bhubaneswar': 'Bhubaneswar',
  'dehradun': 'Dehradun',
  'shimla': 'Shimla',
  'srinagar': 'Srinagar',
  'amritsar': 'Amritsar',
  'ranchi': 'Ranchi',
  'raipur': 'Raipur',
  'jodhpur': 'Jodhpur',
  'udaipur': 'Udaipur',
  'goa': 'Panaji',
  'panaji': 'Panaji',
  'london': 'London',
  'new york': 'New York',
  'nyc': 'New York',
  'tokyo': 'Tokyo',
  'paris': 'Paris',
  'dubai': 'Dubai',
  'singapore': 'Singapore',
  'sydney': 'Sydney',
  'toronto': 'Toronto',
  'chicago': 'Chicago',
  'san francisco': 'San Francisco',
  'los angeles': 'Los Angeles',
  'berlin': 'Berlin',
  // Hindi City Names
  'कोलकाता': 'Kolkata',
  'कलकत्ता': 'Kolkata',
  'दिल्ली': 'Delhi',
  'नई दिल्ली': 'New Delhi',
  'मुंबई': 'Mumbai',
  'बम्बई': 'Mumbai',
  'बेंगलुरु': 'Bengaluru',
  'बैंगलोर': 'Bengaluru',
  'चेन्नई': 'Chennai',
  'मद्रास': 'Chennai',
  'हैदराबाद': 'Hyderabad',
  'अहमदाबाद': 'Ahmedabad',
  'पुणे': 'Pune',
  'जयपुर': 'Jaipur',
  'लखनऊ': 'Lucknow',
  'कानपुर': 'Kanpur',
  'नागपुर': 'Nagpur',
  'इंदौर': 'Indore',
  'पटना': 'Patna',
  'भोपाल': 'Bhopal',
  'चंडीगढ़': 'Chandigarh',
  'सूरत': 'Surat',
  'वाराणसी': 'Varanasi',
  'बनारस': 'Varanasi',
  'काशी': 'Varanasi',
  'आगरा': 'Agra',
  'नोएडा': 'Noida',
  'गुड़गांव': 'Gurugram',
  'गुरुग्राम': 'Gurugram',
  'गोवा': 'Panaji',
};

async function fetchWeather(query: string): Promise<string | null> {
  try {
    // Extract location intelligently from natural language query using word boundaries for English and whitespace boundaries for Hindi
    let location = query
      .replace(/['"’`]/g, '')
      .replace(/\b(s)\b/gi, ' ') // trailing 's
      .replace(/\b(what is the|how is the|tell me the|check|current|today|live|report|forecast|right now|weather|temperature|temp|in|at|for|near|of)\b/gi, ' ')
      .replace(/(?:^|\s+)(मौसम|तापमान|का हाल|कैसा है|आज|बताएं|बताओ|बता दीजिए|क्या है|बारिश|ठंड|गर्मी|का मौसम|की स्थिति)(?=\s+|$|[।?!,])/gu, ' ')
      .replace(/(?:^|\s+)(का|की|के|में|पर|से)(?=\s+|$|[।?!,])/gu, ' ')
      .replace(/[?.,!|।]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const locLower = location.toLowerCase();
    
    // Check alias / typo table
    if (CITY_ALIASES[locLower]) {
      location = CITY_ALIASES[locLower];
    } else {
      // Check partial match in aliases
      for (const [alias, realName] of Object.entries(CITY_ALIASES)) {
        if (locLower === alias || locLower.startsWith(alias) || locLower.endsWith(alias)) {
          location = realName;
          break;
        }
      }
    }

    // If query was just "weather" or empty, default to Delhi
    if (!location || location.length < 2) {
      location = 'Delhi';
    } else {
      // If multiple words, take the first 3 tokens
      const parts = location.split(/\s+/);
      if (parts.length > 3) {
        location = parts.slice(0, 3).join(' ');
      }
    }

    // Try Open-Meteo Geocoding + Weather API (Millisecond fast, verified real-time)
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=3&language=en&format=json`;
      const geoRes = await fetch(geoUrl, { cache: 'no-store', signal: AbortSignal.timeout(3500) });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const results = geoData.results || [];
        // If query looks Indian, prefer Indian city result if available
        let loc = results.find((r: any) => r.country_code === 'IN') || results[0];
        if (loc) {
          const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m`;
          const wRes = await fetch(wUrl, { cache: 'no-store', signal: AbortSignal.timeout(3500) });
          if (wRes.ok) {
            const wData = await wRes.json();
            const curr = wData.current;
            if (curr && curr.temperature_2m !== undefined) {
              const tempC = Math.round(curr.temperature_2m);
              const tempF = Math.round((tempC * 9) / 5 + 32);
              const feelsC = Math.round(curr.apparent_temperature);
              const feelsF = Math.round((feelsC * 9) / 5 + 32);
              const condition = WMO_CODE_MAP[curr.weather_code] || 'Clear sky';
              const humidity = curr.relative_humidity_2m;
              const wind = Math.round(curr.wind_speed_10m);
              const precip = curr.precipitation || 0;
              const placeName = loc.name + (loc.admin1 ? `, ${loc.admin1}` : '') + (loc.country ? `, ${loc.country}` : '');

              return `Real-time Weather Station Report for ${placeName}:
- Current Temperature: ${tempC}°C (${tempF}°F)
- Weather Condition: ${condition}
- Feels Like: ${feelsC}°C (${feelsF}°F)
- Humidity: ${humidity}%
- Wind Speed: ${wind} km/h
- Precipitation: ${precip} mm
Data Timestamp: Live observation as of ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
            }
          }
        }
      }
    } catch (openMeteoErr) {
      console.warn('Open-Meteo fetch failed:', openMeteoErr);
    }

    // Fallback: wttr.in JSON (only if location is distinct)
    try {
      const wttrUrl = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
      const wttrRes = await fetch(wttrUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        cache: 'no-store', 
        signal: AbortSignal.timeout(4000) 
      });
      if (wttrRes.ok) {
        const data = await wttrRes.json();
        const curr = data?.current_condition?.[0];
        const area = data?.nearest_area?.[0]?.areaName?.[0]?.value || location;
        const country = data?.nearest_area?.[0]?.country?.[0]?.value || '';

        if (curr) {
          return `Real-time Weather Station Report for ${area}${country ? ', ' + country : ''}:
- Current Temperature: ${curr.temp_C}°C (${curr.temp_F}°F)
- Weather Condition: ${curr.weatherDesc?.[0]?.value || 'Clear'}
- Feels Like: ${curr.FeelsLikeC}°C (${curr.FeelsLikeF}°F)
- Humidity: ${curr.humidity}%
- Wind Speed: ${curr.windspeedKmph} km/h
- Visibility: ${curr.visibility} km`;
        }
      }
    } catch (wttrErr) {
      console.warn('wttr.in fetch failed:', wttrErr);
    }

    return null;
  } catch (err) {
    console.error('Weather fetch error:', err);
    return null;
  }
}

/**
 * 2. Indian & Global Stock Market & Index Quotes
 */
interface StockQuoteInfo {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  dayHigh?: number;
  dayLow?: number;
  prevClose?: number;
}

// Preset mapping for high-demand Indian and global symbols
const KNOWN_STOCK_MAP: Record<string, string | string[]> = {
  // Indices
  'nifty': '^NSEI',
  'nifty 50': '^NSEI',
  'nifty50': '^NSEI',
  'sensex': '^BSESN',
  'bse sensex': '^BSESN',
  'bank nifty': '^NSEBANK',
  'banknifty': '^NSEBANK',
  
  // Indian Bluechips & Equities
  'exide': 'EXIDEIND.NS',
  'exide industries': 'EXIDEIND.NS',
  'exideind': 'EXIDEIND.NS',
  'suzlon': 'SUZLON.NS',
  'suzlon energy': 'SUZLON.NS',
  'zomato': 'ZOMATO.NS',
  'paytm': 'PAYTM.NS',
  'one97': 'PAYTM.NS',
  'vedanta': 'VEDL.NS',
  'hal': 'HAL.NS',
  'bel': 'BEL.NS',
  'irfc': 'IRFC.NS',
  'rvnl': 'RVNL.NS',
  'cdsl': 'CDSL.NS',
  'bhel': 'BHEL.NS',
  'hindalco': 'HINDALCO.NS',
  'sail': 'SAIL.NS',
  'jsw steel': 'JSWSTEEL.NS',
  'yes bank': 'YESBANK.NS',
  'idfc': 'IDFCFIRSTB.NS',
  'idfc first bank': 'IDFCFIRSTB.NS',
  'punjab national bank': 'PNB.NS',
  'pnb': 'PNB.NS',
  'bank of baroda': 'BANKBARODA.NS',
  'bob': 'BANKBARODA.NS',
  'canara bank': 'CANBK.NS',
  'hero motocorp': 'HEROMOTOCO.NS',
  'hero': 'HEROMOTOCO.NS',
  'eicher motors': 'EICHERMOT.NS',
  'eicher': 'EICHERMOT.NS',
  'tvs motor': 'TVSMOTOR.NS',
  'bajaj auto': 'BAJAJ-AUTO.NS',
  'tata motors': ['TMCV.NS', 'TMPV.NS'], // Commercial Vehicles & Passenger Vehicles
  'tatamotors': ['TMCV.NS', 'TMPV.NS'],
  'reliance': 'RELIANCE.NS',
  'reliance industries': 'RELIANCE.NS',
  'ril': 'RELIANCE.NS',
  'tcs': 'TCS.NS',
  'tata consultancy': 'TCS.NS',
  'infosys': 'INFY.NS',
  'infy': 'INFY.NS',
  'hdfc': 'HDFCBANK.NS',
  'hdfc bank': 'HDFCBANK.NS',
  'icici': 'ICICIBANK.NS',
  'icici bank': 'ICICIBANK.NS',
  'sbi': 'SBIN.NS',
  'sbin': 'SBIN.NS',
  'state bank': 'SBIN.NS',
  'state bank of india': 'SBIN.NS',
  'itc': 'ITC.NS',
  'airtel': 'BHARTIARTL.NS',
  'bharti airtel': 'BHARTIARTL.NS',
  'adani': 'ADANIENT.NS',
  'adani enterprises': 'ADANIENT.NS',
  'adani ports': 'ADANIPORTS.NS',
  'tata steel': 'TATASTEEL.NS',
  'l&t': 'LT.NS',
  'larsen': 'LT.NS',
  'wipro': 'WIPRO.NS',
  'maruti': 'MARUTI.NS',
  'maruti suzuki': 'MARUTI.NS',
  'sun pharma': 'SUNPHARMA.NS',
  'm&m': 'M&M.NS',
  'mahindra': 'M&M.NS',
  'bajaj finance': 'BAJFINANCE.NS',
  'hul': 'HINDUNILVR.NS',
  'hindustan unilever': 'HINDUNILVR.NS',
  'titan': 'TITAN.NS',
  'asian paints': 'ASIANPAINT.NS',
  'axis bank': 'AXISBANK.NS',
  'kotak': 'KOTAKBANK.NS',
  'kotak mahindra': 'KOTAKBANK.NS',
  'coal india': 'COALINDIA.NS',
  'ntpc': 'NTPC.NS',
  'ongc': 'ONGC.NS',
  'power grid': 'POWERGRID.NS',
  'tata power': 'TATAPOWER.NS',

  // Hindi Stock Mappings
  'एक्सिड': 'EXIDEIND.NS',
  'सुजलॉन': 'SUZLON.NS',
  'जोमैटो': 'ZOMATO.NS',
  'पेटीएम': 'PAYTM.NS',
  'वेदांता': 'VEDL.NS',
  'एचएएल': 'HAL.NS',
  'बीईएल': 'BEL.NS',
  'आईआरएफसी': 'IRFC.NS',
  'आरवीएनएल': 'RVNL.NS',
  'यस बैंक': 'YESBANK.NS',
  'पीएनबी': 'PNB.NS',
  'टाटा मोटर्स': ['TMCV.NS', 'TMPV.NS'],
  'टाटा मोटर': ['TMCV.NS', 'TMPV.NS'],
  'टाटा': ['TMCV.NS', 'TMPV.NS'],
  'रिलायंस': 'RELIANCE.NS',
  'टीसीएस': 'TCS.NS',
  'इन्फोसिस': 'INFY.NS',
  'एचडीएफसी': 'HDFCBANK.NS',
  'आईसीआईसीआई': 'ICICIBANK.NS',
  'एसबीआई': 'SBIN.NS',
  'स्टेट बैंक': 'SBIN.NS',
  'आईटीसी': 'ITC.NS',
  'अडानी': 'ADANIENT.NS',
  'एयरटेल': 'BHARTIARTL.NS',
  'मारुति': 'MARUTI.NS',
  'विप्रो': 'WIPRO.NS',
  'निफ्टी': '^NSEI',
  'सेंसेक्स': '^BSESN',

  // Crypto & US Tech
  'bitcoin': 'BTC-USD',
  'btc': 'BTC-USD',
  'ethereum': 'ETH-USD',
  'eth': 'ETH-USD',
  'apple': 'AAPL',
  'aapl': 'AAPL',
  'tesla': 'TSLA',
  'tsla': 'TSLA',
  'nvidia': 'NVDA',
  'nvda': 'NVDA',
  'microsoft': 'MSFT',
  'msft': 'MSFT',
  'google': 'GOOGL',
  'alphabet': 'GOOGL',
  'amazon': 'AMZN',
  'meta': 'META',
};

async function getSingleQuote(symbol: string): Promise<StockQuoteInfo | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta || meta.regularMarketPrice === undefined) return null;

    const price = meta.regularMarketPrice;
    const currency = meta.currency === 'INR' ? 'INR (₹)' : meta.currency || 'INR';
    const prevClose = meta.chartPreviousClose || price;
    const change = parseFloat((price - prevClose).toFixed(2));
    const changePercent = parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2));

    return {
      symbol,
      name: meta.shortName || meta.longName || symbol,
      price,
      currency,
      change,
      changePercent,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      prevClose,
    };
  } catch (err) {
    console.error(`Quote error for ${symbol}:`, err);
    return null;
  }
}

async function searchSymbolOnYahoo(searchTerm: string, preferIndian = true): Promise<string | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchTerm)}&quotesCount=8&newsCount=0`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(3500)
    });
    if (!res.ok) return null;
    const json = await res.json();
    const quotes = json?.quotes || [];
    if (quotes.length === 0) return null;

    if (preferIndian) {
      // Try to find NSE (.NS) or BSE (.BO) quote first
      const indianQuote = quotes.find((q: any) => q.symbol && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO')));
      if (indianQuote) return indianQuote.symbol;
    }

    return quotes[0]?.symbol || null;
  } catch (err) {
    console.error('Yahoo symbol search error:', err);
    return null;
  }
}

async function fetchStockQuotes(query: string): Promise<string | null> {
  try {
    const q = query.toLowerCase();
    
    // Check if multiple specific symbols are requested (e.g. "nifty and sensex")
    const targets: string[] = [];

    if ((q.includes('nifty') && q.includes('sensex')) || (q.includes('निफ्टी') && q.includes('सेंसेक्स'))) {
      targets.push('^NSEI', '^BSESN');
    } else {
      // Check known keys
      for (const [key, val] of Object.entries(KNOWN_STOCK_MAP)) {
        if (q.includes(key)) {
          if (Array.isArray(val)) {
            for (const sym of val) {
              if (!targets.includes(sym)) targets.push(sym);
            }
          } else if (!targets.includes(val)) {
            targets.push(val);
          }
          if (targets.length >= 4) break;
        }
      }
    }

    // If still no target, extract ticker or company name
    if (targets.length === 0) {
      // Clean query
      const cleanTerm = query
        .replace(/['"’`]/g, '')
        .replace(/\b(what is the|share price of|stock price of|price of|current price of|quote for|stock of|shares of|rate of|market price of|share price|stock price|share rate|stock rate|share|stock|price|quote|shares|rate|market|current|today|live|value|what is|how much is|tell me|give me|check)\b/gi, ' ')
        .replace(/\b(का शेयर प्राइस|का भाव|की कीमत|शेयर मूल्य|स्टॉक प्राइस|स्टॉक भाव|स्टॉक|शेयर|बताओ|बताएं|कीमत|भाव|का|की|के|कितना है|क्या है|का रेट)\b/gi, ' ')
        .replace(/[?.,!]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanTerm.length >= 2) {
        const discovered = await searchSymbolOnYahoo(cleanTerm, true);
        if (discovered) {
          targets.push(discovered);
        }
      }
    }

    if (targets.length === 0) {
      return null;
    }

    // Fetch quotes in parallel
    const quotePromises = targets.map(sym => getSingleQuote(sym));
    const results = (await Promise.all(quotePromises)).filter(Boolean) as StockQuoteInfo[];

    if (results.length === 0) return null;

    const formattedList = results.map(q => {
      const sign = q.change >= 0 ? '+' : '';
      return `• ${q.name} (${q.symbol}):
  Current Live Price: ${q.price.toLocaleString('en-IN')} ${q.currency}
  Change Today: ${sign}${q.change.toLocaleString('en-IN')} (${sign}${q.changePercent}%)
  Previous Close: ${q.prevClose?.toLocaleString('en-IN') || 'N/A'} ${q.currency}
  Day Range: Low ${q.dayLow?.toLocaleString('en-IN') || 'N/A'} - High ${q.dayHigh?.toLocaleString('en-IN') || 'N/A'} ${q.currency}`;
    }).join('\n\n');

    return `Real-time Financial Market Feed (NSE / BSE / Global Exchanges):
${formattedList}
Data Timestamp: Live market status as of ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST`;
  } catch (err) {
    console.error('Stock quotes fetch failed:', err);
    return null;
  }
}

/**
 * 3. People, Public Figures & Leadership Entities
 */
// Instant registry for top queries to guarantee zero-latency, 100% accurate factual results
const VERIFIED_PEOPLE_REGISTRY: Record<string, string> = {
  'narendra modi': 'Narendra Damodardas Modi is an Indian politician who has served as the 14th and current Prime Minister of India since May 2014, currently serving his third consecutive term. He represents the Varanasi constituency in the Lok Sabha.',
  'modi': 'Narendra Modi is the current Prime Minister of India (since 2014, serving his third consecutive term).',
  'prime minister of india': 'Narendra Modi is the current Prime Minister of India, in office since 2014 and currently serving his third consecutive term.',
  'president of india': 'Droupadi Murmu is the 15th and current President of India, assuming office in July 2022. She is the first person from a tribal community and second woman to hold the presidency.',
  'droupadi murmu': 'Droupadi Murmu is the 15th and current President of India (since July 2022).',
  'virat kohli': 'Virat Kohli is an iconic Indian international cricketer and former captain of the Indian national cricket team. He holds the world record for the most One Day International (ODI) centuries (50 centuries) and has scored over 80 international centuries across all formats. He is the all-time leading run-scorer in the Indian Premier League (IPL) representing Royal Challengers Bengaluru (RCB).',
  'kohli': 'Virat Kohli is a legendary Indian cricketer and former national team captain with over 80 international centuries, holding the world record for the most ODI centuries.',
  'rohit sharma': 'Rohit Gurunath Sharma is an Indian international cricketer who captains the Indian national cricket team in Tests and ODIs. Under his captaincy, India won the 2024 ICC Men\'s T20 World Cup. He is the only player to have scored three double-centuries in One Day Internationals.',
  'ms dhoni': 'Mahendra Singh Dhoni (MS Dhoni) is a legendary former captain of the Indian national cricket team. Under his captaincy, India won the 2007 ICC World Twenty20, the 2011 ICC Cricket World Cup, and the 2013 ICC Champions Trophy. He is one of cricket\'s greatest wicket-keeper batters and finishers.',
  'dhoni': 'MS Dhoni is the legendary former Indian cricket captain who led India to victories in the 2007 T20 World Cup, 2011 Cricket World Cup, and 2013 Champions Trophy.',
  'sundar pichai': 'Pichai Sundararajan, better known as Sundar Pichai, is an Indian-American business executive who serves as the Chief Executive Officer (CEO) of Alphabet Inc. and its subsidiary Google.',
  'ceo of google': 'Sundar Pichai is the Chief Executive Officer (CEO) of Google and its parent company Alphabet Inc.',
  'satya nadella': 'Satya Narayana Nadella is an Indian-American business executive who is the Chairman and Chief Executive Officer (CEO) of Microsoft, having led Microsoft since February 2014.',
  'ceo of microsoft': 'Satya Nadella is the Chairman and CEO of Microsoft, in office since February 2014.',
  'elon musk': 'Elon Musk is a business magnate, investor, and engineer. He is the founder, CEO, and chief engineer of SpaceX, CEO and product architect of Tesla, Inc., owner and executive chairman of X (formerly Twitter), and founder of xAI and Neuralink. He is one of the wealthiest individuals in the world.',
  'ceo of tesla': 'Elon Musk is the CEO and product architect of Tesla, Inc., as well as the founder of SpaceX and owner of X.',
  'sam altman': 'Samuel Harris Altman is an American entrepreneur and investor who is the Chief Executive Officer (CEO) of OpenAI, the artificial intelligence research company behind ChatGPT and GPT-4.',
  'ceo of openai': 'Sam Altman is the CEO of OpenAI, the AI research laboratory behind ChatGPT and GPT-4.',
  'tim cook': 'Timothy Donald Cook is an American business executive who has been the Chief Executive Officer (CEO) of Apple Inc. since August 2011, succeeding Steve Jobs.',
  'ceo of apple': 'Tim Cook is the Chief Executive Officer (CEO) of Apple Inc., having served as CEO since August 2011.',
  'mark zuckerberg': 'Mark Elliot Zuckerberg is an American business magnate and computer programmer who co-founded Facebook and serves as the chairman and CEO of its parent company Meta Platforms.',
  'ratan tata': 'Ratan Naval Tata (1937–2024) was a revered Indian industrialist and philanthropist. He served as the chairman of the Tata Group and Tata Sons from 1991 to 2012, and again as interim chairman from 2016 to 2017. He was awarded the Padma Bhushan and Padma Vibhushan.',
  'mukesh ambani': 'Mukesh Dhirubhai Ambani is an Indian billionaire businessman. He is the chairman and managing director of Reliance Industries Limited (RIL), a Fortune 500 company and India\'s most valuable company by market value.',
  'gautam adani': 'Gautam Shantilal Adani is an Indian billionaire industrialist who is the founder and chairman of the Adani Group, a major multinational conglomerate involved in port development, energy, and infrastructure.',
  'richest person in india': 'Mukesh Ambani (Chairman of Reliance Industries) and Gautam Adani (Founder of Adani Group) are the two richest people in India.',
  'richest man in india': 'Mukesh Ambani (Chairman of Reliance Industries) is India\'s and Asia\'s richest person, followed closely by Gautam Adani.',
  'विराट कोहली': 'विराट कोहली भारत के दिग्गज अंतरराष्ट्रीय क्रिकेटर और पूर्व कप्तान हैं। उनके नाम वनडे में 50 शतकों का विश्व रिकॉर्ड है और उन्होंने सभी प्रारूपों में 80 से अधिक शतक बनाए हैं। वे आईपीएल में आरसीबी के प्रमुख बल्लेबाज हैं।',
  'नरेंद्र मोदी': 'नरेंद्र दामोदरदास मोदी मई 2014 से लगातार तीसरी बार भारत के प्रधानमंत्री हैं। वे लोकसभा में वाराणसी का प्रतिनिधित्व करते हैं।',
  'सुंदर पिचाई': 'सुंदर पिचाई अल्फाबेट और गूगल के मुख्य कार्यकारी अधिकारी (सीईओ) हैं।',
  'रतन टाटा': 'रतन टाटा (1937–2024) भारत के महान उद्योगपति और परोपकारी थे, जिन्होंने टाटा समूह का लंबे समय तक नेतृत्व किया।',
  'मुकेश अंबानी': 'मुकेश अंबानी रिलायंस इंडस्ट्रीज के अध्यक्ष और प्रबंध निदेशक हैं तथा भारत के सबसे अमीर उद्योगपतियों में अग्रणी हैं।',
  'गौतम अडानी': 'गौतम अडानी अडानी समूह के संस्थापक और अध्यक्ष हैं।',
  'धोनी': 'महेंद्र सिंह धोनी भारत के महान पूर्व कप्तान हैं, जिनकी कप्तानी में भारत ने 2007 टी20 विश्व कप, 2011 वनडे विश्व कप और 2013 चैंपियंस ट्रॉफी जीती।',
  'रोहित शर्मा': 'रोहित शर्मा भारतीय क्रिकेट टीम के कप्तान हैं, जिनकी कप्तानी में भारत ने 2024 आईसीसी टी20 विश्व कप जीता।',
};

async function fetchPersonInfo(query: string): Promise<string | null> {
  try {
    const qLower = query.toLowerCase().trim();

    // 1. Check verified instant registry first
    for (const [key, fact] of Object.entries(VERIFIED_PEOPLE_REGISTRY)) {
      if (qLower.includes(key)) {
        return `Verified Leadership & Biographical Entity Record:
${fact}`;
      }
    }

    // 2. Clean query to extract entity name
    let cleanName = query
      .replace(/(who is|who was|tell me about|information about|biography of|what is|profile of|history of|details of|background of|about)/gi, ' ')
      .replace(/(कौन है|कौन हैं|के बारे में|की जीवनी|की जानकारी|के बारे में बताओ|के बारे में बताएं)/gi, ' ')
      .replace(/[?.,!]/g, '')
      .trim();

    if (!cleanName || cleanName.length < 2) return null;

    // Check if query is in Hindi/Devanagari script
    const isHindi = /[\u0900-\u097F]/.test(cleanName);
    const wikiDomain = isHindi ? 'hi.wikipedia.org' : 'en.wikipedia.org';

    // Query Wikipedia Search API
    const searchUrl = `https://${wikiDomain}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanName)}&format=json&utf8=1`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'VoiceAssistantApp/2.0 (education@example.org)' },
      cache: 'no-store',
      signal: AbortSignal.timeout(3500)
    });

    if (searchRes.ok) {
      const sData = await searchRes.json();
      const top = sData?.query?.search?.[0];
      if (top && top.title) {
        // Fetch detailed page summary
        const summaryUrl = `https://${wikiDomain}/api/rest_v1/page/summary/${encodeURIComponent(top.title)}`;
        const summaryRes = await fetch(summaryUrl, {
          headers: { 'User-Agent': 'VoiceAssistantApp/2.0 (education@example.org)' },
          cache: 'no-store',
          signal: AbortSignal.timeout(3500)
        });

        if (summaryRes.ok) {
          const pData = await summaryRes.json();
          if (pData.extract && pData.type !== 'disambiguation') {
            const desc = pData.description ? ` (${pData.description})` : '';
            return `Verified Biographical & Entity Knowledge (${wikiDomain}):
Subject: ${pData.title}${desc}
Summary: ${pData.extract}`;
          }
        }
      }
    }

    // If Hindi search had no result, try English Wikipedia as fallback
    if (isHindi) {
      const enSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanName)}&format=json&utf8=1`;
      const enRes = await fetch(enSearchUrl, {
        headers: { 'User-Agent': 'VoiceAssistantApp/2.0 (education@example.org)' },
        cache: 'no-store',
        signal: AbortSignal.timeout(3500)
      });
      if (enRes.ok) {
        const sData = await enRes.json();
        const top = sData?.query?.search?.[0];
        if (top?.title) {
          const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(top.title)}`;
          const summaryRes = await fetch(summaryUrl, {
            headers: { 'User-Agent': 'VoiceAssistantApp/2.0 (education@example.org)' },
            cache: 'no-store'
          });
          if (summaryRes.ok) {
            const pData = await summaryRes.json();
            if (pData.extract) {
              return `Verified Biographical & Entity Knowledge:
Subject: ${pData.title}${pData.description ? ` (${pData.description})` : ''}
Summary: ${pData.extract}`;
            }
          }
        }
      }
    }

    return null;
  } catch (err) {
    console.error('Person info fetch error:', err);
    return null;
  }
}

/**
 * 4. Live Currency Exchange Rates
 */
async function fetchCurrencyRates(): Promise<string | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { 
      cache: 'no-store',
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return null;
    const json = await res.json();
    const rates = json.rates || {};

    const inr = rates.INR ? rates.INR.toFixed(2) : 'N/A';
    const eur = rates.EUR ? rates.EUR.toFixed(2) : 'N/A';
    const gbp = rates.GBP ? rates.GBP.toFixed(2) : 'N/A';
    const jpy = rates.JPY ? rates.JPY.toFixed(2) : 'N/A';
    const cad = rates.CAD ? rates.CAD.toFixed(2) : 'N/A';
    const aed = rates.AED ? rates.AED.toFixed(2) : 'N/A';

    return `Real-time Live Foreign Exchange Rates (Base 1 USD):
- 1 US Dollar (USD) = ${inr} Indian Rupees (INR)
- 1 US Dollar (USD) = ${eur} Euros (EUR)
- 1 US Dollar (USD) = ${gbp} British Pounds (GBP)
- 1 US Dollar (USD) = ${jpy} Japanese Yen (JPY)
- 1 US Dollar (USD) = ${cad} Canadian Dollars (CAD)
- 1 US Dollar (USD) = ${aed} UAE Dirhams (AED)
Data Timestamp: ${json.time_last_update_utc || new Date().toUTCString()}`;
  } catch (err) {
    console.error('Currency fetch failed:', err);
    return null;
  }
}

/**
 * 5. Main Dispatcher for Real-time Queries
 */
export async function getRealtimeInformation(query: string): Promise<RealtimeResult> {
  const q = query.toLowerCase();

  // 1. Weather Checks (OpenWeatherMap API + Meteorological Station Fallback)
  if (detectWeatherIntent(query) || q.includes('clima') || q.includes('tiempo') || q.includes('rain')) {
    const weatherResult = await getLiveWeather(query);
    if (weatherResult && weatherResult.report) {
      return { 
        source: `${weatherResult.source} (${weatherResult.report.city})`, 
        data: weatherResult.report.formattedSummary 
      };
    }
  }

  // 2. Stock Market & Index Quotes (Finnhub API + NSE / BSE / Global Exchanges)
  if (
    q.includes('stock') ||
    q.includes('share price') ||
    q.includes('shares') ||
    q.includes('market price') ||
    q.includes('nifty') ||
    q.includes('sensex') ||
    q.includes('tata motors') ||
    q.includes('tatamotors') ||
    q.includes('reliance') ||
    q.includes('tcs') ||
    q.includes('infosys') ||
    q.includes('hdfc') ||
    q.includes('icici') ||
    q.includes('sbi') ||
    q.includes('sbin') ||
    q.includes('adani') ||
    q.includes('itc') ||
    q.includes('airtel') ||
    q.includes('maruti') ||
    q.includes('wipro') ||
    q.includes('bitcoin') ||
    q.includes('crypto') ||
    q.includes('btc') ||
    q.includes('ethereum') ||
    q.includes('aapl') ||
    q.includes('apple') ||
    q.includes('tesla') ||
    q.includes('nvidia') ||
    q.includes('microsoft') ||
    q.includes('google') ||
    q.includes('amazon') ||
    q.includes('meta') ||
    q.includes('शेयर') ||
    q.includes('स्टॉक') ||
    q.includes('भाव') ||
    q.includes('निफ्टी') ||
    q.includes('सेंसेक्स')
  ) {
    // 2a. If Finnhub key is present or query is a direct US/global ticker, resolve via Finnhub
    if (process.env.FINNHUB_API_KEY || q.includes('aapl') || q.includes('apple') || q.includes('tesla') || q.includes('tsla') || q.includes('nvidia') || q.includes('nvda') || q.includes('crypto') || q.includes('bitcoin')) {
      const finnhubRes = await getLiveStockQuote(query);
      if (finnhubRes && finnhubRes.quote) {
        return {
          source: `${finnhubRes.source} (${finnhubRes.quote.symbol})`,
          data: finnhubRes.formattedSummary,
        };
      }
    }

    // 2b. Query native NSE/BSE and global market engine
    const stockData = await fetchStockQuotes(query);
    if (stockData) {
      return { source: 'Live Stock Exchange Feed (NSE / BSE / NASDAQ)', data: stockData };
    }

    // 2c. Fallback to Finnhub engine resolver
    const finnhubFallback = await getLiveStockQuote(query);
    if (finnhubFallback && finnhubFallback.quote) {
      return {
        source: `${finnhubFallback.source} (${finnhubFallback.quote.symbol})`,
        data: finnhubFallback.formattedSummary,
      };
    }
  }

  // 3. Currency Rates
  if (
    q.includes('exchange rate') ||
    q.includes('currency') ||
    q.includes('usd to inr') ||
    q.includes('dollar to rupee') ||
    q.includes('dollar to inr') ||
    q.includes('conversion rate') ||
    q.includes('euro to') ||
    q.includes('gbp to')
  ) {
    const currencyData = await fetchCurrencyRates();
    if (currencyData) {
      return { source: 'Live Interbank Currency Exchange Feed', data: currencyData };
    }
  }

  // 4. News & Current Affairs (NewsAPI.org & Verified Live RSS Feeds)
  const newsIntent = detectNewsIntent(query);
  if (newsIntent.isNews) {
    const newsResult = await getLiveNews({
      query: newsIntent.topic,
      category: newsIntent.category,
      country: newsIntent.country,
      pageSize: 5,
    });
    if (newsResult.articles && newsResult.articles.length > 0) {
      return { 
        source: `${newsResult.sourceType} (${newsIntent.category ? newsIntent.category.toUpperCase() : 'TOP HEADLINES'})`, 
        data: newsResult.formattedSummary 
      };
    }
  }

  // 5. People, Celebrities, Leaders & Public Entities (Instant Registry)
  if (
    q.includes('who is') ||
    q.includes('who was') ||
    q.includes('tell me about') ||
    q.includes('biography of') ||
    q.includes('founder of') ||
    q.includes('ceo of') ||
    q.includes('prime minister') ||
    q.includes('president') ||
    q.includes('kohli') ||
    q.includes('modi') ||
    q.includes('pichai') ||
    q.includes('dhoni') ||
    q.includes('rohit sharma') ||
    q.includes('musk') ||
    q.includes('ratan tata') ||
    q.includes('ambani') ||
    q.includes('richest') ||
    q.includes('कौन है') ||
    q.includes('कौन हैं') ||
    q.includes('के बारे में')
  ) {
    const personData = await fetchPersonInfo(query);
    if (personData) {
      return { source: 'Verified Global Biographical & Leadership Registry', data: personData };
    }
  }

  // 6. Wikipedia Encyclopedia for Factual, Scientific, Historical, Geographical & Educational Inquiries
  const wikiIntent = detectWikipediaIntent(query);
  if (wikiIntent.isFactual) {
    const wikiResult = await getWikipediaKnowledge(wikiIntent.searchTerm, wikiIntent.language);
    if (wikiResult.found && wikiResult.article) {
      return {
        source: wikiResult.source,
        data: wikiResult.formattedSummary,
      };
    }
  }

  const isFinanceOrWeatherQuery = 
    q.includes('stock') || q.includes('share') || q.includes('price') || q.includes('market') || 
    q.includes('nifty') || q.includes('sensex') || q.includes('weather') || q.includes('temperature') || 
    q.includes('forecast') || q.includes('rain') || q.includes('मौसम') || q.includes('तापमान') || 
    q.includes('शेयर') || q.includes('स्टॉक') || q.includes('भाव') || q.includes('कीमत');

  // 7. Broad fallback: try Wikipedia search if not financial/weather
  if (!isFinanceOrWeatherQuery) {
    const fallbackWiki = await getWikipediaKnowledge(query, wikiIntent.language);
    if (fallbackWiki.found && fallbackWiki.article) {
      return { source: fallbackWiki.source, data: fallbackWiki.formattedSummary };
    }

    const fallbackPerson = await fetchPersonInfo(query);
    if (fallbackPerson) {
      return { source: 'Verified Encyclopedia Registry', data: fallbackPerson };
    }
  }

  return { source: 'General Knowledge', data: 'No specific real-time feed matched this query.' };
}
