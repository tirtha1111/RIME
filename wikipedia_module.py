"""
P.H.I. Wikipedia Knowledge Module
=================================
Fetches verified encyclopedic factual summaries from Wikipedia's official
REST and MediaWiki APIs (en.wikipedia.org and hi.wikipedia.org) for factual,
scientific, historical, geographical, and educational queries.
"""

import logging
import urllib.request
import urllib.parse
import json

logger = logging.getLogger("PHI_Wikipedia")

def search_wikipedia(query: str, lang: str = "en") -> str:
    """
    Searches Wikipedia for a given term or question and returns a concise factual extract.
    """
    domain = f"{lang}.wikipedia.org" if lang in ["hi", "en"] else "en.wikipedia.org"
    
    # Clean query
    cleaned = (
        query.lower()
        .replace("what is the", "")
        .replace("what is", "")
        .replace("what was", "")
        .replace("who is", "")
        .replace("who was", "")
        .replace("who invented", "")
        .replace("who discovered", "")
        .replace("where is", "")
        .replace("tell me about", "")
        .replace("explain", "")
        .replace("history of", "")
        .replace("क्या है", "")
        .replace("के बारे में बताओ", "")
        .strip("?.,! ")
    )
    
    term = cleaned if len(cleaned) >= 2 else query.strip()
    
    try:
        # Step 1: Query search API to find exact matching page title
        search_params = {
            'action': 'query',
            'list': 'search',
            'srsearch': term,
            'utf8': '1',
            'format': 'json',
            'srlimit': '2'
        }
        search_url = f"https://{domain}/w/api.php?{urllib.parse.urlencode(search_params)}"
        req = urllib.request.Request(
            search_url,
            headers={'User-Agent': 'PHI-AI-Voice-Assistant/2.0 (contact@phi-ai.org)'}
        )
        
        with urllib.request.urlopen(req, timeout=4) as response:
            if response.status != 200:
                return ""
            data = json.loads(response.read().decode('utf-8'))
            
        results = data.get('query', {}).get('search', [])
        if not results:
            if lang == "hi":
                return search_wikipedia(query, lang="en")
            return ""
            
        top_title = results[0].get('title', '').replace(' ', '_')
        if not top_title:
            return ""
            
        # Step 2: Fetch REST summary
        summary_url = f"https://{domain}/api/rest_v1/page/summary/{urllib.parse.quote(top_title)}"
        req_sum = urllib.request.Request(
            summary_url,
            headers={'User-Agent': 'PHI-AI-Voice-Assistant/2.0 (contact@phi-ai.org)'}
        )
        
        with urllib.request.urlopen(req_sum, timeout=4) as response:
            if response.status == 200:
                sum_data = json.loads(response.read().decode('utf-8'))
                extract = sum_data.get('extract', '')
                title = sum_data.get('title', '')
                desc = sum_data.get('description', '')
                
                if extract:
                    return f"Wikipedia Knowledge ({title}{f' - {desc}' if desc else ''}):\n{extract}"
                    
        return ""
    except Exception as e:
        logger.error(f"Wikipedia search failed for '{query}': {e}")
        return ""

if __name__ == "__main__":
    print("Testing Wikipedia module...")
    print(search_wikipedia("What is the Taj Mahal"))
    print(search_wikipedia("प्रकाश संश्लेषण क्या है", lang="hi"))
