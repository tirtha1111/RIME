import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getHuggingFaceToken(): string | null {
  return process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || null;
}

// STT Models on Hugging Face router / inference API
const STT_MODELS = [
  'openai/whisper-large-v3-turbo',
  'openai/whisper-large-v3',
  'openai/whisper-base',
  'facebook/wav2vec2-large-960h'
];

export async function POST(req: Request) {
  try {
    const token = getHuggingFaceToken();
    if (!token) {
      return NextResponse.json(
        { error: 'HUGGINGFACE_API_KEY or HF_TOKEN is not configured in Settings > Secrets.' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const modelParam = formData.get('model') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided in request.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const modelsToTry = modelParam ? [modelParam, ...STT_MODELS.filter(m => m !== modelParam)] : STT_MODELS;

    let lastError = '';
    for (const model of modelsToTry) {
      try {
        // Hugging Face Inference API / Router endpoint
        const endpoint = `https://router.huggingface.co/hf-inference/models/${model}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': file.type || 'audio/wav',
            'x-use-cache': 'false',
          },
          body: audioBuffer,
        });

        if (!res.ok) {
          // Fallback endpoint in case router is different for the token tier
          const fallbackEndpoint = `https://api-inference.huggingface.co/models/${model}`;
          const fallbackRes = await fetch(fallbackEndpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': file.type || 'audio/wav',
              'x-use-cache': 'false',
            },
            body: audioBuffer,
          });

          if (!fallbackRes.ok) {
            const errText = await fallbackRes.text();
            lastError = `Model ${model} returned ${fallbackRes.status}: ${errText}`;
            console.warn(lastError);
            continue;
          }

          const data = await fallbackRes.json();
          const text = data.text || data[0]?.text || '';
          if (text) {
            return NextResponse.json({ text: text.trim(), model, provider: 'huggingface' });
          }
        } else {
          const data = await res.json();
          const text = data.text || data[0]?.text || '';
          if (text) {
            return NextResponse.json({ text: text.trim(), model, provider: 'huggingface' });
          }
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn(`STT with ${model} failed:`, err);
      }
    }

    return NextResponse.json(
      { error: `Hugging Face STT failed across available models. ${lastError}` },
      { status: 502 }
    );
  } catch (error: any) {
    console.error('Hugging Face STT route error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error in voice to text' }, { status: 500 });
  }
}
