/**
 * P.H.I. Wikipedia Knowledge Integration Service
 * =============================================
 * Connects directly to Wikipedia's official MediaWiki & REST APIs
 * (en.wikipedia.org, hi.wikipedia.org, and global editions) to provide
 * instant, accurate factual encyclopedic answers for history, science,
 * geography, technology, culture, inventions, definitions, and concepts.
 */

export interface WikipediaArticle {
  title: string;
  description?: string;
  extract: string;
  pageUrl?: string;
  thumbnailUrl?: string;
  language: string;
}

export interface WikipediaResponse {
  found: boolean;
  source: string;
  article?: WikipediaArticle;
  formattedSummary: string;
}

// Common trigger patterns for factual / encyclopedic queries
const FACTUAL_TRIGGERS = [
  'what is',
  'what are',
  'what was',
  'what were',
  'who is',
  'who was',
  'who were',
  'who invented',
  'who discovered',
  'who built',
  'who created',
  'who founded',
  'where is',
  'where was',
  'where are',
  'when was',
  'when did',
  'how does',
  'how do',
  'tell me about',
  'information about',
  'explain',
  'definition of',
  'meaning of',
  'history of',
  'origin of',
  'biography of',
  'summary of',
  'capital of',
  'currency of',
  'tallest',
  'largest',
  'deepest',
  'smallest',
  'fastest',
  'highest',
  'distance between',
  'speed of',
  'formula for',
  'laws of',
  'theory of',
  'photosynthesis',
  'quantum',
  'relativity',
  'gravity',
  'dna',
  'isro',
  'nasa',
  'taj mahal',
  'chandrayaan',
  'mangalyaan',
  'solar system',
  'black hole',
  // Hindi factual triggers
  'क्या है',
  'क्या होता है',
  'किसे कहते हैं',
  'का अर्थ',
  'का मतलब',
  'का इतिहास',
  'की खोज किसने की',
  'का आविष्कार किसने किया',
  'कहाँ है',
  'कहाँ स्थित है',
  'कब हुआ',
  'कैसे काम करता है',
  'के बारे में बताओ',
  'के बारे में बताएं',
  'की राजधानी',
  'का सिद्धांत',
  'की परिभाषा',
];

/**
 * Detects if a user query is asking a factual / encyclopedic question
 */
export function detectWikipediaIntent(query: string): {
  isFactual: boolean;
  searchTerm: string;
  language: 'en' | 'hi';
} {
  const q = query.toLowerCase().trim();
  const isHindi = /[\u0900-\u097F]/.test(query);

  // Check if matches factual keywords or has encyclopedic phrasing
  const hasTrigger = FACTUAL_TRIGGERS.some(t => q.includes(t));

  // Clean the query to get the core topic for Wikipedia search
  let cleanTerm = query
    .replace(/\b(what is the|what is|what are the|what are|what was the|what was|who is the|who is|who was the|who was|who were|who invented|who discovered|who founded|who built|who created)\b/gi, ' ')
    .replace(/\b(where is the|where is|where was|when was the|when was|when did|how does the|how does|how do|how works|how to)\b/gi, ' ')
    .replace(/\b(tell me about the|tell me about|give me information about|information on|information about|explain the|explain|definition of|meaning of|history of the|history of|biography of|summary of)\b/gi, ' ')
    .replace(/\b(please|can you|could you|PHI|phi|assistant|search|lookup|find out|know about|about)\b/gi, ' ')
    // Hindi cleaning
    .replace(/(क्या है|क्या होता है|किसे कहते हैं|का अर्थ क्या है|का मतलब क्या है|का इतिहास क्या है|की खोज किसने की|का आविष्कार किसने किया|कहाँ है|कहाँ स्थित है|कब हुआ|कैसे काम करता है|के बारे में बताओ|के बारे में बताएं|की जानकारी दो|की जानकारी दें|बताओ|बताएं|की परिभाषा)/gu, ' ')
    .replace(/(?:^|\s+)(का|की|के|में|पर|से|है|था|थी|थे)(?=\s+|$|[।?!,])/gu, ' ')
    .replace(/[?.,!|।]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If query is short or was a direct question
  const isFactual = hasTrigger || (cleanTerm.length >= 2 && !q.includes('weather') && !q.includes('stock') && !q.includes('news'));

  return {
    isFactual,
    searchTerm: cleanTerm.length >= 2 ? cleanTerm : query.trim(),
    language: isHindi ? 'hi' : 'en',
  };
}

/**
 * Fetch factual extract from Wikipedia REST / MediaWiki API
 */
export async function getWikipediaKnowledge(searchTerm: string, preferredLang: 'en' | 'hi' = 'en'): Promise<WikipediaResponse> {
  const lang = preferredLang === 'hi' ? 'hi' : 'en';
  const domain = `${lang}.wikipedia.org`;

  try {
    // 1. Direct Page Summary lookup if exact title matches
    const summaryUrl = `https://${domain}/api/rest_v1/page/summary/${encodeURIComponent(searchTerm.replace(/ /g, '_'))}`;
    const summaryRes = await fetch(summaryUrl, {
      headers: {
        'User-Agent': 'PHI-AI-Encyclopedia/2.0 (contact@phi-ai.org)',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    });

    if (summaryRes.ok) {
      const pData = await summaryRes.json();
      if (pData.extract && pData.type !== 'disambiguation') {
        const desc = pData.description ? ` (${pData.description})` : '';
        const article: WikipediaArticle = {
          title: pData.title,
          description: pData.description,
          extract: pData.extract,
          pageUrl: pData.content_urls?.desktop?.page,
          thumbnailUrl: pData.thumbnail?.source,
          language: lang,
        };

        return {
          found: true,
          source: `Wikipedia Encyclopedia (${domain})`,
          article,
          formattedSummary: `Verified Encyclopedic Knowledge from Wikipedia (${pData.title}${desc}):\n${pData.extract}`,
        };
      }
    }

    // 2. OpenSearch / Query search API to find matching article title
    const searchUrl = `https://${domain}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&utf8=1&format=json&srlimit=3`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'PHI-AI-Encyclopedia/2.0 (contact@phi-ai.org)',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    });

    if (searchRes.ok) {
      const sData = await searchRes.json();
      const topResults = sData?.query?.search || [];

      for (const res of topResults) {
        if (!res.title) continue;

        // Fetch detailed page summary for the top result
        const pageSummaryUrl = `https://${domain}/api/rest_v1/page/summary/${encodeURIComponent(res.title.replace(/ /g, '_'))}`;
        const pageRes = await fetch(pageSummaryUrl, {
          headers: {
            'User-Agent': 'PHI-AI-Encyclopedia/2.0 (contact@phi-ai.org)',
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
        });

        if (pageRes.ok) {
          const pageData = await pageRes.json();
          if (pageData.extract && pageData.type !== 'disambiguation') {
            const desc = pageData.description ? ` (${pageData.description})` : '';
            const article: WikipediaArticle = {
              title: pageData.title,
              description: pageData.description,
              extract: pageData.extract,
              pageUrl: pageData.content_urls?.desktop?.page,
              thumbnailUrl: pageData.thumbnail?.source,
              language: lang,
            };

            return {
              found: true,
              source: `Wikipedia Encyclopedia (${domain})`,
              article,
              formattedSummary: `Verified Encyclopedic Knowledge from Wikipedia (${pageData.title}${desc}):\n${pageData.extract}`,
            };
          }
        }
      }
    }

    // 3. Fallback to English Wikipedia if Hindi did not return results
    if (lang === 'hi') {
      return await getWikipediaKnowledge(searchTerm, 'en');
    }

    return {
      found: false,
      source: 'Wikipedia Encyclopedia',
      formattedSummary: `No direct Wikipedia entry found for "${searchTerm}".`,
    };
  } catch (err: any) {
    console.error('Wikipedia query error:', err);
    return {
      found: false,
      source: 'Wikipedia Encyclopedia',
      formattedSummary: `Wikipedia query temporarily unavailable: ${err?.message || 'timeout'}`,
    };
  }
}
