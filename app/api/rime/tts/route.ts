import { NextRequest, NextResponse } from 'next/server';
import { getLanguageById } from '@/lib/rimeVoices';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { text, lang = 'eng', speaker, modelId } = await req.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Text prompt is required.' }, { status: 400 });
    }

    const apiKey = process.env.RIME_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'RIME_API_KEY is not configured in environment variables. Please provide your Rime API key in Settings > Secrets.',
          configured: false 
        }, 
        { status: 401 }
      );
    }

    // Resolve language defaults
    const languageConfig = getLanguageById(lang);
    
    // Check if requested speaker exists in verified speakers list, otherwise fallback to default speaker
    const validSpeakers = languageConfig.speakers.map(s => s.id);
    let chosenSpeaker = (speaker && validSpeakers.includes(speaker.toLowerCase())) 
      ? speaker.toLowerCase() 
      : languageConfig.defaultSpeaker;

    const chosenModel = modelId || languageConfig.defaultModel || 'coda';

    // Helper to invoke Rime TTS
    const callRime = async (spk: string, mdl: string) => {
      return fetch('https://users.rime.ai/v1/rime-tts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'audio/mp3',
        },
        body: JSON.stringify({
          text: text.trim(),
          speaker: spk,
          modelId: mdl,
          lang: lang,
          audioFormat: 'mp3',
        }),
      });
    };

    let rimeRes = await callRime(chosenSpeaker, chosenModel);

    // If Rime reports an invalid speaker error, retry once with the canonical default speaker
    if (!rimeRes.ok && rimeRes.status === 400 && chosenSpeaker !== languageConfig.defaultSpeaker) {
      console.warn(`Speaker ${chosenSpeaker} was rejected by Rime. Retrying with default speaker: ${languageConfig.defaultSpeaker}`);
      chosenSpeaker = languageConfig.defaultSpeaker;
      rimeRes = await callRime(chosenSpeaker, chosenModel);
    }

    if (!rimeRes.ok) {
      const errText = await rimeRes.text();
      console.error('Rime TTS API Error response:', rimeRes.status, errText);
      return NextResponse.json(
        { 
          error: `Rime TTS failed with HTTP ${rimeRes.status}: ${errText || rimeRes.statusText}`,
          configured: true 
        },
        { status: rimeRes.status }
      );
    }

    const audioArrayBuffer = await rimeRes.arrayBuffer();

    return new Response(audioArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioArrayBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error: any) {
    console.error('Exception in Rime TTS route:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while synthesizing Rime audio.' },
      { status: 500 }
    );
  }
}
