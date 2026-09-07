import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { logConversation } from '@/lib/dataStore';
import { getRealtimeInformation } from '@/lib/realtimeEngine';
import { generateImageFromPrompt } from '@/lib/imageGenerator';

export const dynamic = 'force-dynamic';

const GROQ_MODEL = 'openai/gpt-oss-120b';

// Lazy initialize Groq client
function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'missing_key' || apiKey === 'gsk_your_actual_api_key_here' || apiKey.trim() === '') return null;
  return new Groq({ apiKey: apiKey.trim() });
}

// Keywords in English, Hindi, and Spanish for Image Generation
const IMAGE_GEN_KEYWORDS = [
  'generate image', 'generate an image', 'generate me an image', 'generate a photo', 'generate picture',
  'create image', 'create an image', 'create a photo', 'create picture', 'create artwork',
  'make an image', 'make a photo', 'make a picture', 'make wallpaper',
  'draw', 'draw a', 'draw an', 'draw me', 'paint a', 'paint an', 'paint me', 'sketch',
  'render', 'render an image', 'design an image', 'design a logo',
  'show me an image', 'show me a picture', 'show me a photo', 'show an image',
  'image of', 'photo of', 'picture of', 'wallpaper of', 'artwork of', 'illustration of',
  'generate visual', 'create visual', 'can you draw', 'can you make an image',
  'तस्वीर बनाओ', 'फोटो बनाओ', 'चित्र बनाओ', 'इमेज बनाओ', 'तस्वीर तैयार करो', 'फोटो दिखाओ',
  'genera una imagen', 'crea una imagen', 'haz una imagen', 'dibuja', 'haz una foto'
];

// Keywords for opening an existing or newly generated image in a separate window
const OPEN_IMAGE_KEYWORDS = [
  'show the image in a separate window', 'show the image in separate window',
  'show image in separate window', 'show image in a separate window',
  'open the image in a separate window', 'open the image in separate window',
  'open image in separate window', 'open image in a separate window',
  'open image in new window', 'show image in new window', 'open in separate window',
  'show in separate window', 'open in new window', 'show in new window',
  'show the image', 'open the image', 'show me the image', 'show me the picture',
  'open the picture', 'display image in window', 'open image window', 'zoom image',
  'अलग विंडो में फोटो दिखाओ', 'अलग विंडो में तस्वीर दिखाओ', 'तस्वीर दिखाओ', 'इमेज दिखाओ', 'फोटो दिखाओ',
  'abrir imagen en ventana', 'mostrar imagen en ventana'
];

function isImageGenerationQuery(query: string): boolean {
  const q = query.toLowerCase().trim();
  return IMAGE_GEN_KEYWORDS.some(k => q.includes(k));
}

function isOpenImageWindowQuery(query: string): boolean {
  const q = query.toLowerCase().trim();
  return OPEN_IMAGE_KEYWORDS.some(k => q.includes(k));
}

function wantsSeparateWindow(query: string): boolean {
  const q = query.toLowerCase().trim();
  return (
    q.includes('separate window') || 
    q.includes('new window') || 
    q.includes('popup') || 
    q.includes('pop out') || 
    q.includes('अलग विंडो')
  );
}

function extractImagePrompt(query: string): string {
  let cleaned = query.trim();

  // Strip trailing "and show in separate window" instructions from prompt
  cleaned = cleaned.replace(/\s+(and\s+)?(show|open|display)\s+(it\s+)?(in\s+)?(a\s+)?(separate|new)\s+window.*$/i, '');
  cleaned = cleaned.replace(/\s+(in\s+)?(a\s+)?(separate|new)\s+window.*$/i, '');
  cleaned = cleaned.replace(/\s+(और\s+)?(अलग|नई)\s+विंडो\s+में\s+(दिखाओ|खोलो).*$/i, '');

  const prefixes = [
    /^(please\s+)?generate\s+(an?\s+)?(image|photo|picture|wallpaper|artwork)\s+(of|about|for|showing)?\s*/i,
    /^(please\s+)?create\s+(an?\s+)?(image|photo|picture|wallpaper|artwork)\s+(of|about|for|showing)?\s*/i,
    /^(please\s+)?make\s+(an?\s+)?(image|photo|picture|wallpaper|artwork)\s+(of|about|for|showing)?\s*/i,
    /^(please\s+)?draw\s+(an?\s+)?(image|photo|picture)?\s*(of|about|for|showing)?\s*/i,
    /^(please\s+)?paint\s+(an?\s+)?(image|photo|picture)?\s*(of|about|for|showing)?\s*/i,
    /^(please\s+)?show\s+me\s+(an?\s+)?(image|photo|picture)\s+(of|about|for|showing)?\s*/i,
    /^(please\s+)?render\s+(an?\s+)?(image|photo|picture)?\s*(of|about|for|showing)?\s*/i,
    /^(फोटो|तस्वीर|चित्र)\s+(बनाओ|दिखाओ)\s*/i
  ];

  for (const regex of prefixes) {
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '').trim();
      break;
    }
  }

  return cleaned || query;
}

// Keywords in English, Hindi, and Spanish that indicate a live real-time query
const REALTIME_KEYWORDS = [
  // Weather
  'weather', 'temperature', 'forecast', 'rain', 'climate', 'humidity', 'celsius', 'fahrenheit', 'degree',
  'मौसम', 'तापमान', 'बारिश', 'ठंड', 'गर्मी', 'clima', 'tiempo', 'temperatura',
  
  // Indian & Global Stocks & Crypto
  'stock', 'share price', 'market price', 'nasdaq', 'nifty', 'sensex', 'dow', 'bse', 'nse',
  'tata motors', 'tatamotors', 'reliance', 'tcs', 'infosys', 'sbi', 'sbin', 'hdfc', 'icici', 'itc',
  'adani', 'airtel', 'maruti', 'wipro', 'titan', 'kotak', 'apple', 'tesla', 'nvidia', 'microsoft', 'google', 'amazon',
  'exchange rate', 'currency', 'usd to inr', 'dollar to rupee', 'dollar to inr', 'euro to', 'gbp to',
  'bitcoin', 'crypto', 'btc', 'ethereum', 'eth', 'price of',
  'शेयर', 'स्टॉक', 'भाव', 'कीमत', 'निफ्टी', 'सेंसेक्स', 'रुपया',
  
  // People & Public Figures
  'who is', 'who was', 'tell me about', 'biography of', 'founder of', 'ceo of', 'president of', 'prime minister of',
  'narendra modi', 'modi', 'virat kohli', 'kohli', 'rohit sharma', 'ms dhoni', 'dhoni', 'sachin',
  'sundar pichai', 'satya nadella', 'elon musk', 'sam altman', 'tim cook', 'mark zuckerberg',
  'ratan tata', 'mukesh ambani', 'gautam adani', 'droupadi murmu', 'richest',
  'कौन है', 'कौन हैं', 'के बारे में', 'जीवनी', 'quién es', 'qui est',
  
  // News & Live
  'news', 'today', 'current', 'score', 'match', 'election', 'live', 'headline', 'breaking', 'समाचार', 'खबर'
];

function isFastRealtimeQuery(query: string): boolean {
  const q = query.toLowerCase();
  return REALTIME_KEYWORDS.some(k => q.includes(k));
}

function cleanModelOutput(text: string): string {
  if (!text) return '';
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!cleaned && text.includes('</think>')) {
    cleaned = text.split('</think>').pop()?.trim() || '';
  }
  if (!cleaned && text.startsWith('<think>')) {
    cleaned = text.replace(/<think>/gi, '').trim();
  }
  return cleaned || text;
}

// Call Groq API strictly with openai/gpt-oss-120b
async function callGroqOss120b(systemPrompt: string, userQuery: string, temperature = 0.6, maxTokens = 600): Promise<string> {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error('Groq client not available. Please configure GROQ_API_KEY in Settings > Secrets.');
  }

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery }
    ],
    temperature,
    max_tokens: maxTokens,
  });

  const content = response.choices[0]?.message?.content || '';
  const cleaned = cleanModelOutput(content);
  if (!cleaned) {
    throw new Error('Empty response received from Groq openai/gpt-oss-120b.');
  }

  return cleaned;
}

export async function POST(req: Request) {
  try {
    const { 
      query, 
      hostName, 
      lang = 'eng',
      interruptedContext,
      history = [],
      activeImage = null
    } = await req.json();

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ text: "I didn't catch that. Could you please say that again?" }, { status: 400 });
    }

    const languageInstructions: Record<string, string> = {
      hin: "Answer fluently and naturally in Hindi (हिन्दी). Do not use English script.",
      spa: "Answer fluently and naturally in Spanish (Español).",
      eng: "Answer fluently and naturally in English.",
      fra: "Answer fluently and naturally in French (Français).",
      deu: "Answer fluently and naturally in German (Deutsch).",
      cmn: "Answer fluently and naturally in Mandarin Chinese (中文).",
      jpn: "Answer fluently and naturally in Japanese (日本語).",
      por: "Answer fluently and naturally in Portuguese (Português).",
      ara: "Answer fluently and naturally in Modern Standard Arabic (العربية).",
      ita: "Answer fluently and naturally in Italian (Italiano).",
      heb: "Answer fluently and naturally in Hebrew (עבריत)."
    };
    const langNote = languageInstructions[lang] || "Answer fluently in natural spoken English.";

    // Build Interruption Follow-up Guidance
    let interruptionNote = "";
    if (interruptedContext && interruptedContext.wasInterrupted && interruptedContext.previousAssistantText) {
      interruptionNote = `\n\nCRITICAL INTERRUPTION CONTEXT:
The user interrupted your previous response mid-speech.
Your previous interrupted response was: "${interruptedContext.previousAssistantText}".
The user's new interruption input is: "${query}".
Guidelines for follow-up:
1. Seamlessly acknowledge or pivot to their new input.
2. Follow up smoothly by addressing what they just said while connecting back or neatly concluding the previous topic if relevant.
3. Keep the flow completely natural for continuous spoken voice conversation.`;
    }

    // 1. Check if query is explicitly asking to open / show existing image in a separate window
    if (isOpenImageWindowQuery(query)) {
      if (activeImage && activeImage.url) {
        const spokenReply = lang === 'hin'
          ? "मैंने तस्वीर को आपके लिए अलग विंडो में खोल दिया है।"
          : "Opening the image in a separate window for you now.";

        logConversation(hostName || 'Unknown', query, spokenReply, 'open-image-window');

        return NextResponse.json({
          text: spokenReply,
          intent: 'open-image-window',
          provider: 'groq/openai-gpt-oss-120b',
          openImageWindow: true,
          image: activeImage
        });
      } else {
        const spokenReply = lang === 'hin'
          ? "अभी कोई तस्वीर उपलब्ध नहीं है। कृपया पहले तस्वीर बनाने के लिए कहें, जैसे कि 'एक साइबरपंक शहर की तस्वीर बनाओ'। "
          : "No image has been generated yet. Please ask me to generate an image first, for example, 'Generate an image of a futuristic neon supercar'.";

        logConversation(hostName || 'Unknown', query, spokenReply, 'chatbot');

        return NextResponse.json({
          text: spokenReply,
          intent: 'chatbot',
          provider: 'groq/openai-gpt-oss-120b'
        });
      }
    }

    // 2. Check if query is an Image Generation Request
    if (isImageGenerationQuery(query)) {
      const openInWindow = wantsSeparateWindow(query);
      const extractedPrompt = extractImagePrompt(query);
      const generatedImage = await generateImageFromPrompt(extractedPrompt);

      let spokenReply = "";
      if (openInWindow) {
        spokenReply = lang === 'hin'
          ? `मैंने "${extractedPrompt}" की तस्वीर तैयार कर दी है और इसे अलग विंडो में खोल दिया है।`
          : `I have generated the image for "${extractedPrompt}" and opened it in a separate window for you.`;
      } else {
        spokenReply = lang === 'hin'
          ? `मैंने आपके लिए "${extractedPrompt}" की तस्वीर तैयार कर दी है। आप इसे अलग विंडो में देखने के लिए भी कह सकते हैं।`
          : `I have generated the image for "${extractedPrompt}". You can ask me to open it in a separate window at any time.`;
      }

      logConversation(hostName || 'Unknown', query, spokenReply, 'image-generation');

      return NextResponse.json({
        text: spokenReply,
        intent: 'image-generation',
        provider: 'groq/openai-gpt-oss-120b',
        openImageWindow: openInWindow,
        image: generatedImage ? {
          url: generatedImage.imageUrl,
          prompt: generatedImage.prompt,
          model: generatedImage.model,
          provider: generatedImage.provider
        } : null
      });
    }

    // 3. Determine if query is real-time
    let isRealtime = isFastRealtimeQuery(query);

    if (!isRealtime) {
      try {
        const categoryPrompt = `You are a query classifier for a voice assistant. Reply with exactly one word: "image", "realtime", or "chatbot".
"image": Creating, generating, painting, or drawing photos, wallpapers, pictures, or visuals.
"realtime": Live stock prices, Indian share market, live weather, sports, currency rates, people biographies, leadership queries, recent facts, Wikipedia facts.
"chatbot": Greetings, general conversation, jokes, advice, personal philosophy, creative ideas.
Do not explain.`;
        const resText = await callGroqOss120b(categoryPrompt, query, 0.1, 10);
        const lowerRes = resText.toLowerCase();
        if (lowerRes.includes('image')) {
          const openInWindow = wantsSeparateWindow(query);
          const extractedPrompt = extractImagePrompt(query);
          const generatedImage = await generateImageFromPrompt(extractedPrompt);
          
          let spokenReply = "";
          if (openInWindow) {
            spokenReply = lang === 'hin'
              ? `मैंने "${extractedPrompt}" की तस्वीर तैयार कर दी है और इसे अलग विंडो में खोल दिया है।`
              : `I have generated the image for "${extractedPrompt}" and opened it in a separate window for you.`;
          } else {
            spokenReply = lang === 'hin'
              ? `मैंने आपके लिए "${extractedPrompt}" की तस्वीर तैयार कर दी है।`
              : `I have generated the image for "${extractedPrompt}".`;
          }

          logConversation(hostName || 'Unknown', query, spokenReply, 'image-generation');

          return NextResponse.json({
            text: spokenReply,
            intent: 'image-generation',
            provider: 'groq/openai-gpt-oss-120b',
            openImageWindow: openInWindow,
            image: generatedImage ? {
              url: generatedImage.imageUrl,
              prompt: generatedImage.prompt,
              model: generatedImage.model,
              provider: generatedImage.provider
            } : null
          });
        } else if (lowerRes.includes('realtime')) {
          isRealtime = true;
        }
      } catch (catErr) {
        console.warn("Classification fallback check:", catErr);
      }
    }

    let finalAnswer = "";

    if (isRealtime) {
      // Fetch verified live real-time data from our multi-tiered engine
      const realtimeInfo = await getRealtimeInformation(query);

      const systemPrompt = `You are P.H.I., a high-precision, natural voice assistant powered exclusively by Groq LPU inference using model ${GROQ_MODEL}.
Your response will be spoken out loud through text-to-speech audio.

Here is the verified, live real-time data sourced right now from ${realtimeInfo.source}:
${realtimeInfo.data}
${interruptionNote}

Voice synthesis guidelines:
1. Synthesize this information into a concise, direct, and pleasant spoken answer (1-3 sentences).
2. ALWAYS include the exact real-time numbers, rates, prices, or temperatures present in the data (e.g. exact rupee/dollar stock price, temperature degrees, or current facts).
3. Speak directly to the user. Never say "According to the feed" or "Based on the live data". State the facts directly.
4. Keep the wording clear and pronounceable for text-to-speech (e.g. write "rupees", "dollars", or "degrees Celsius" naturally).
5. Language requirement: ${langNote}`;

      try {
        finalAnswer = await callGroqOss120b(systemPrompt, query, 0.2, 500);
      } catch (groqErr: any) {
        console.error("Groq openai/gpt-oss-120b realtime error:", groqErr);
        finalAnswer = `I retrieved the live data (${realtimeInfo.data.slice(0, 100)}...), but Groq ${GROQ_MODEL} requires your GROQ_API_KEY in Settings > Secrets.`;
      }
    } else {
      const historyContext = Array.isArray(history) && history.length > 0
        ? `\nRecent conversation history:\n${history.slice(-3).map((h: any) => `${h.speaker}: ${h.text}`).join('\n')}`
        : '';

      const systemPrompt = `You are P.H.I., an intelligent, polite, and concise voice assistant powered exclusively by Groq LPU inference using model ${GROQ_MODEL}.
You are equipped with a built-in high-resolution FLUX visual synthesis engine and a dedicated separate window image viewer.
If the user asks if you can generate images, draw, paint, or make pictures, eagerly confirm that you can generate any visual they describe and ask what they would like to create.
Never state that you cannot generate images or that you are a text-only assistant.
Answer directly in 1-2 friendly sentences suitable for spoken voice output.
Do not use markdown asterisks, hash signs, or bullet points.${historyContext}${interruptionNote}
Language requirement: ${langNote}`;

      try {
        finalAnswer = await callGroqOss120b(systemPrompt, query, 0.7, 500);
      } catch (groqErr: any) {
        console.error("Groq openai/gpt-oss-120b chat error:", groqErr);
        finalAnswer = `Please ensure your GROQ_API_KEY is configured in Settings > Secrets to power the Groq ${GROQ_MODEL} inference engine.`;
      }
    }

    // Clean any markdown formatting so speech synthesis reads cleanly
    finalAnswer = finalAnswer.replace(/[*#_`~]/g, '').trim();
    
    logConversation(hostName || 'Unknown', query, finalAnswer, isRealtime ? 'realtime' : 'chatbot');

    return NextResponse.json({ 
      text: finalAnswer, 
      intent: isRealtime ? 'realtime' : 'chatbot',
      provider: 'groq/openai-gpt-oss-120b',
      model: GROQ_MODEL,
      followedUpOnInterruption: Boolean(interruptedContext?.wasInterrupted)
    });
  } catch (err: any) {
    console.error("API Error", err);
    return NextResponse.json({ 
      text: "I encountered an error processing your request with Groq openai/gpt-oss-120b.",
      error: err?.message 
    }, { status: 500 });
  }
}
