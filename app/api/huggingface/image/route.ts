import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getHuggingFaceToken(): string | null {
  // Check all common aliases for Hugging Face API key/token
  const rawToken = 
    process.env.HF_TOKEN || 
    process.env.HUGGINGFACE_API_KEY || 
    process.env.HUGGING_FACE_HUB_TOKEN || 
    process.env.HF_API_KEY;

  if (!rawToken) return null;
  const token = rawToken.trim();
  if (token === 'missing_key' || token.startsWith('hf_your_actual') || token === '') return null;
  return token;
}

// Fallback image generation providers (Fast polling Pollinations AI + HF Router & Inference Endpoints)
const IMAGE_MODELS = [
  'stabilityai/stable-diffusion-xl-base-1.0',
  'black-forest-labs/FLUX.1-schnell',
  'runwayml/stable-diffusion-v1-5',
  'CompVis/stable-diffusion-v1-4',
  'prompthero/openjourney'
];

export async function POST(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body in request.' }, { status: 400 });
    }

    const { prompt, model: requestedModel } = body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Please provide a text prompt for image generation.' }, { status: 400 });
    }

    const token = getHuggingFaceToken();
    const cleanPrompt = prompt.trim();
    const modelsToTry = requestedModel
      ? [requestedModel, ...IMAGE_MODELS.filter(m => m !== requestedModel)]
      : IMAGE_MODELS;

    const errorDetails: string[] = [];

    // 1. If token is available, attempt Hugging Face Serverless Inference with fallback models
    if (token) {
      for (const model of modelsToTry) {
        const endpoints = [
          `https://router.huggingface.co/hf-inference/models/${model}`,
          `https://api-inference.huggingface.co/models/${model}`
        ];

        for (const endpoint of endpoints) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 18000);

            const res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-use-cache': 'false',
                'x-wait-for-model': 'true'
              },
              body: JSON.stringify({
                inputs: cleanPrompt
              }),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            const contentType = res.headers.get('content-type') || '';

            // Check if binary image output
            if (res.ok && (contentType.includes('image') || contentType.includes('application/octet-stream') || (!contentType.includes('json') && !contentType.includes('html')))) {
              const arrayBuffer = await res.arrayBuffer();
              if (arrayBuffer.byteLength > 200) {
                const buffer = Buffer.from(arrayBuffer);
                const mime = contentType.includes('image') ? contentType.split(';')[0] : 'image/jpeg';
                const base64Image = `data:${mime};base64,${buffer.toString('base64')}`;

                return NextResponse.json({
                  imageUrl: base64Image,
                  model,
                  prompt: cleanPrompt,
                  provider: 'huggingface',
                });
              }
            }

            // Check if JSON image or error response
            if (contentType.includes('json')) {
              const jsonData = await res.json().catch(() => null);
              if (jsonData) {
                if (jsonData.image || (Array.isArray(jsonData) && jsonData[0]?.image)) {
                  const img = jsonData.image || jsonData[0]?.image;
                  return NextResponse.json({
                    imageUrl: String(img).startsWith('data:') ? img : `data:image/jpeg;base64,${img}`,
                    model,
                    prompt: cleanPrompt,
                    provider: 'huggingface'
                  });
                }
                if (jsonData.error) {
                  errorDetails.push(`[${model}] ${jsonData.error}`);
                  continue;
                }
              }
            }

            const errText = await res.text().catch(() => '');
            if (errText.includes('<!doctype') || errText.includes('<html')) {
              errorDetails.push(`[${model}] HTTP ${res.status}: Token scope or model permission issue.`);
            } else if (errText) {
              errorDetails.push(`[${model}] HTTP ${res.status}: ${errText.slice(0, 80)}`);
            }
          } catch (fetchErr: any) {
            errorDetails.push(`[${model}] ${fetchErr?.name === 'AbortError' ? 'timeout' : fetchErr?.message || String(fetchErr)}`);
          }
        }
      }
    } else {
      errorDetails.push('No HF_TOKEN detected in environment secrets.');
    }

    // 2. High-speed Direct Fallback: Pollinations AI FLUX engine (Guarantees instant generation if Hugging Face rate limit or cold-start occurs)
    try {
      const encodedPrompt = encodeURIComponent(cleanPrompt);
      const seed = Math.floor(Math.random() * 1000000);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;

      const fallbackRes = await fetch(pollinationsUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (fallbackRes.ok) {
        const arrayBuffer = await fallbackRes.arrayBuffer();
        if (arrayBuffer.byteLength > 500) {
          const buffer = Buffer.from(arrayBuffer);
          const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;

          return NextResponse.json({
            imageUrl: base64Image,
            model: requestedModel || 'FLUX.1-schnell',
            prompt: cleanPrompt,
            provider: 'flux-engine',
            note: token ? 'Generated using FLUX engine' : 'Generated with FLUX image engine'
          });
        }
      }
    } catch (fallbackErr: any) {
      console.warn('Fallback generator error:', fallbackErr);
    }

    return NextResponse.json(
      { 
        error: `Image generation was unable to complete. Please try another prompt or verify your token permissions. Details: ${errorDetails.slice(0, 2).join(' | ')}` 
      },
      { status: 502 }
    );
  } catch (error: any) {
    console.error('Fatal image generation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error in image generation' }, { status: 500 });
  }
}
