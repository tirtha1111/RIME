import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WHISPER_LANG_MAPPING: Record<string, string> = {
  eng: 'en',
  hin: 'hi',
  spa: 'es',
  fra: 'fr',
  deu: 'de',
  cmn: 'zh',
  jpn: 'ja',
  por: 'pt',
  ara: 'ar',
  ita: 'it',
  heb: 'he'
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'missing_key' || apiKey === 'gsk_your_actual_api_key_here' || apiKey.trim() === '') {
      return NextResponse.json({
        text: '',
        error: 'Groq API Key is not configured. Please add GROQ_API_KEY to Settings > Secrets.'
      }, { status: 400 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('file') as File | null;
    const langId = formData.get('lang') as string | null;

    if (!audioFile) {
      return NextResponse.json({ text: '', error: 'No audio file provided.' }, { status: 400 });
    }

    // Determine target language code for Whisper model optimization
    const targetLang = langId ? (WHISPER_LANG_MAPPING[langId] || 'en') : 'en';

    // Prepare payload to send to Groq OpenAI-compatible Whisper endpoint
    const groqFormData = new FormData();
    groqFormData.append('file', audioFile);
    groqFormData.append('model', 'whisper-large-v3');
    groqFormData.append('language', targetLang);
    groqFormData.append('response_format', 'json');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: groqFormData,
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq Whisper API Error:', errorText);
      return NextResponse.json({ text: '', error: `Groq Whisper API failed: ${groqResponse.statusText}` }, { status: 500 });
    }

    const data = await groqResponse.json();
    const transcribedText = (data.text || '').trim();

    return NextResponse.json({ text: transcribedText });
  } catch (err: any) {
    console.error('Transcription route error:', err);
    return NextResponse.json({ text: '', error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
