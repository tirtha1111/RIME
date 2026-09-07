import { NextResponse } from 'next/server';
import { RIME_LANGUAGES } from '@/lib/rimeVoices';

export async function GET() {
  const apiKey = process.env.RIME_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey.trim().length > 5);

  return NextResponse.json({
    configured: isConfigured,
    totalLanguages: RIME_LANGUAGES.length,
    languages: RIME_LANGUAGES.map(l => ({
      id: l.id,
      name: l.name,
      nativeName: l.nativeName,
      flag: l.flag,
      speakersCount: l.speakers.length,
      defaultSpeaker: l.defaultSpeaker
    }))
  });
}
