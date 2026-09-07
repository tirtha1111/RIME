/**
 * P.H.I. News API Integration Service
 * ===================================
 * Connects to NewsAPI.org (using NEWS_API_KEY) with intelligent fallback to
 * verified news RSS feeds (Google News / BBC / Reuters / Times of India)
 * for seamless real-time news retrieval across categories, countries, and queries.
 */

import * as cheerio from 'cheerio';

export interface NewsArticle {
  title: string;
  source: string;
  description: string;
  url?: string;
  publishedAt?: string;
  category?: string;
}

export interface NewsResponse {
  configured: boolean;
  sourceType: 'NewsAPI.org' | 'Verified Live RSS Feed';
  totalResults: number;
  articles: NewsArticle[];
  formattedSummary: string;
}

// Category extraction mapping
const CATEGORY_KEYWORDS: Record<string, string> = {
  // Technology
  tech: 'technology',
  technology: 'technology',
  ai: 'technology',
  software: 'technology',
  crypto: 'technology',
  gadgets: 'technology',
  apple: 'technology',
  google: 'technology',
  microsoft: 'technology',
  nvidia: 'technology',
  तकनीक: 'technology',
  टेक: 'technology',

  // Business / Finance
  business: 'business',
  finance: 'business',
  economy: 'business',
  market: 'business',
  stock: 'business',
  money: 'business',
  व्यापार: 'business',
  कारोबार: 'business',
  अर्थव्यवस्था: 'business',

  // Sports
  sports: 'sports',
  sport: 'sports',
  cricket: 'sports',
  football: 'sports',
  soccer: 'sports',
  tennis: 'sports',
  olympics: 'sports',
  ipl: 'sports',
  खेल: 'sports',
  क्रिकेट: 'sports',

  // Entertainment
  entertainment: 'entertainment',
  movies: 'entertainment',
  cinema: 'entertainment',
  hollywood: 'entertainment',
  bollywood: 'entertainment',
  music: 'entertainment',
  मनोरंजन: 'entertainment',
  सिनेमा: 'entertainment',

  // Science
  science: 'science',
  space: 'science',
  nasa: 'science',
  isro: 'science',
  physics: 'science',
  विज्ञान: 'science',
  अंतरिक्ष: 'science',

  // Health
  health: 'health',
  medical: 'health',
  medicine: 'health',
  fitness: 'health',
  स्वास्थ्य: 'health',
  चिकित्सा: 'health',
};

// Country extraction mapping
const COUNTRY_KEYWORDS: Record<string, string> = {
  india: 'in',
  indian: 'in',
  bharat: 'in',
  भारत: 'in',
  इंडिया: 'in',
  usa: 'us',
  america: 'us',
  american: 'us',
  'united states': 'us',
  uk: 'gb',
  britain: 'gb',
  england: 'gb',
  'united kingdom': 'gb',
  canada: 'ca',
  australia: 'au',
  germany: 'de',
  france: 'fr',
  japan: 'jp',
};

export function detectNewsIntent(query: string): {
  isNews: boolean;
  topic?: string;
  category?: string;
  country?: string;
} {
  const q = query.toLowerCase().trim();

  const newsTriggers = [
    'news',
    'headline',
    'headlines',
    'breaking news',
    'top stories',
    'latest stories',
    'current affairs',
    'what is happening in',
    'what happened in',
    'updates on',
    'daily digest',
    'bulletin',
    'समाचार',
    'खबर',
    'ताज़ा खबर',
    'ताज़ा समाचार',
    'आज की ताजा खबर',
    'मुख्य समाचार',
    'हेडलाइंस',
    'न्यूज़',
    'noticias',
    'nouvelles',
    'nachrichten',
    'notizie',
  ];

  const matchedTrigger = newsTriggers.some(t => q.includes(t));
  if (!matchedTrigger) {
    return { isNews: false };
  }

  // Detect category
  let category: string | undefined = undefined;
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (q.includes(kw)) {
      category = cat;
      break;
    }
  }

  // Detect country
  let country: string | undefined = undefined;
  for (const [kw, cCode] of Object.entries(COUNTRY_KEYWORDS)) {
    if (q.includes(kw)) {
      country = cCode;
      break;
    }
  }
  // Default to India if Hindi or query suggests India, else general
  if (!country && (/[\u0900-\u097F]/.test(query) || q.includes('delhi') || q.includes('mumbai') || q.includes('modi'))) {
    country = 'in';
  }

  // Clean topic from query
  let topic = query
    .replace(/\b(what is the|tell me the|give me the|get the|check the|latest|breaking|top|today|recent|current|news|headlines|stories|updates|about|on|in|for|from|regarding)\b/gi, ' ')
    .replace(/(ताज़ा|ताजा|समाचार|खबरें|खबर|मुख्य|आज की|बताओ|बताएं|के बारे में|की स्थिति|का हाल|न्यूज़|हेडलाइंस)/gi, ' ')
    .replace(/[?.,!|।]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If topic is purely the country or category name, clear it so top-headlines category endpoint works cleanly
  if (topic && (topic.toLowerCase() === 'india' || topic.toLowerCase() === 'technology' || topic.toLowerCase() === 'sports' || topic.toLowerCase() === 'world')) {
    topic = '';
  }

  return {
    isNews: true,
    topic: topic.length > 2 ? topic : undefined,
    category,
    country: country || 'in',
  };
}

/**
 * Fetch from NewsAPI.org directly using NEWS_API_KEY
 */
async function fetchFromNewsAPI(params: {
  apiKey: string;
  query?: string;
  category?: string;
  country?: string;
  pageSize?: number;
}): Promise<NewsArticle[]> {
  const { apiKey, query, category, country = 'in', pageSize = 6 } = params;

  let url: string;
  if (query && query.trim().length > 1) {
    // Everything endpoint for keyword searches
    url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${pageSize}&language=en`;
  } else {
    // Top headlines endpoint
    const catParam = category ? `&category=${encodeURIComponent(category)}` : '';
    const countryParam = country ? `&country=${encodeURIComponent(country)}` : '&country=in';
    url = `https://newsapi.org/v2/top-headlines?pageSize=${pageSize}${countryParam}${catParam}`;
  }

  const res = await fetch(url, {
    headers: {
      'X-Api-Key': apiKey,
      'User-Agent': 'PHI-AI-Voice-Assistant/2.0',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(4500),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.warn(`NewsAPI.org request returned status ${res.status}: ${errorText}`);
    throw new Error(`NewsAPI error: ${res.status}`);
  }

  const data = await res.json();
  if (data.status !== 'ok' || !Array.isArray(data.articles)) {
    return [];
  }

  return data.articles
    .filter((a: any) => a.title && a.title !== '[Removed]')
    .map((a: any) => ({
      title: a.title,
      source: a.source?.name || 'NewsAPI Source',
      description: a.description || a.content || '',
      url: a.url,
      publishedAt: a.publishedAt,
    }));
}

/**
 * Fallback to Google News & RSS Feeds if NEWS_API_KEY is not configured or fails
 */
async function fetchFromLiveRSS(params: {
  query?: string;
  country?: string;
  category?: string;
}): Promise<NewsArticle[]> {
  try {
    const { query, country = 'in', category } = params;

    let rssUrl: string;
    if (query && query.trim().length > 1) {
      rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    } else if (category === 'technology') {
      rssUrl = `https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en`;
    } else if (category === 'business') {
      rssUrl = `https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en`;
    } else if (category === 'sports') {
      rssUrl = `https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-IN&gl=IN&ceid=IN:en`;
    } else if (category === 'entertainment') {
      rssUrl = `https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-IN&gl=IN&ceid=IN:en`;
    } else if (category === 'science') {
      rssUrl = `https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-IN&gl=IN&ceid=IN:en`;
    } else if (category === 'health') {
      rssUrl = `https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-IN&gl=IN&ceid=IN:en`;
    } else {
      rssUrl = `https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en`;
    }

    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const articles: NewsArticle[] = [];

    $('item').each((i, el) => {
      if (i >= 5) return;
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim();
      const pubDate = $(el).find('pubDate').text().trim();
      const source = $(el).find('source').text().trim() || 'Verified News Service';
      const descHtml = $(el).find('description').text().trim();
      const $desc = cheerio.load(descHtml);
      const cleanDesc = $desc.text().replace(/<[^>]*>/g, '').trim();

      if (title) {
        articles.push({
          title,
          source,
          description: cleanDesc,
          url: link,
          publishedAt: pubDate,
        });
      }
    });

    return articles;
  } catch (err) {
    console.error('RSS fallback news fetch error:', err);
    return [];
  }
}

/**
 * Main News Query Resolver
 */
export async function getLiveNews(options: {
  query?: string;
  category?: string;
  country?: string;
  pageSize?: number;
}): Promise<NewsResponse> {
  const apiKey = process.env.NEWS_API_KEY;
  let articles: NewsArticle[] = [];
  let sourceType: 'NewsAPI.org' | 'Verified Live RSS Feed' = 'Verified Live RSS Feed';
  let isConfigured = Boolean(apiKey);

  if (apiKey) {
    try {
      articles = await fetchFromNewsAPI({
        apiKey,
        query: options.query,
        category: options.category,
        country: options.country,
        pageSize: options.pageSize || 5,
      });
      sourceType = 'NewsAPI.org';
    } catch (apiErr) {
      console.warn('NewsAPI.org failed, falling back to verified RSS:', apiErr);
      articles = await fetchFromLiveRSS({
        query: options.query,
        category: options.category,
        country: options.country,
      });
    }
  } else {
    articles = await fetchFromLiveRSS({
      query: options.query,
      category: options.category,
      country: options.country,
    });
  }

  // Format into conversational bulletin
  const formattedItems = articles.map((a, idx) => {
    return `${idx + 1}. [${a.source}] ${a.title}${a.description ? ` - ${a.description.slice(0, 160)}...` : ''}`;
  }).join('\n\n');

  const formattedSummary = articles.length > 0
    ? `Real-time Live News Bulletin (${sourceType}):\n${formattedItems}\n\nLive Broadcast Timestamp: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
    : `No current news headlines found for the requested topic.`;

  return {
    configured: isConfigured,
    sourceType,
    totalResults: articles.length,
    articles,
    formattedSummary,
  };
}
