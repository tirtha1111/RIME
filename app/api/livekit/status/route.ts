import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const LIVEKIT_MODELS = [
  {
    id: 'gpt-realtime-2.1',
    name: 'LiveKit Realtime 2.1 (Speech-to-Speech)',
    description: 'Ultra-low latency (~280ms p95) native audio multimodal streaming agent.',
    type: 'speech-to-speech',
    tag: 'NEW 2026',
    provider: 'OpenAI Realtime API / LiveKit Inference',
    badgeColor: 'emerald',
  },
  {
    id: 'pipeline-deepgram-gemini-rime',
    name: 'LiveKit Pipeline (Deepgram Nova-3 + Gemini 3.8 + Rime)',
    description: 'Deepgram Nova-3 STT + Google Gemini 3.8 Flash LLM + Rime Coda neural TTS with Silero VAD.',
    type: 'pipeline',
    tag: 'ULTRA FAST',
    provider: 'Deepgram + Gemini + Rime',
    badgeColor: 'cyan',
  },
  {
    id: 'gemini-3.1-live',
    name: 'LiveKit Multimodal (Gemini 3.1 Live Audio)',
    description: 'Google DeepMind multimodal audio streaming agent with search grounding.',
    type: 'speech-to-speech',
    tag: 'GEMINI LIVE',
    provider: 'Google Live Audio / LiveKit Inference',
    badgeColor: 'purple',
  },
  {
    id: 'pipeline-whisper-llama-cartesia',
    name: 'LiveKit Pipeline (Whisper Turbo + Llama 3.3 + Cartesia)',
    description: 'Whisper Large v3 Turbo + Llama 3.3 70B + Cartesia Sonic-3.5 voice synthesis.',
    type: 'pipeline',
    tag: 'OPEN WEIGHTS',
    provider: 'Inference Engine + Cartesia',
    badgeColor: 'blue',
  },
];

export async function GET() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  const configured = Boolean(apiKey && apiSecret && livekitUrl);

  return NextResponse.json({
    configured,
    url: livekitUrl ? livekitUrl.replace(/\/\/.*@/, '//') : null,
    hasApiKey: Boolean(apiKey),
    hasApiSecret: Boolean(apiSecret),
    models: LIVEKIT_MODELS,
    defaultModel: 'gpt-realtime-2.1',
  });
}
