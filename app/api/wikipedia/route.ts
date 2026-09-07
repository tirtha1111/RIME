import { NextRequest, NextResponse } from 'next/server';
import { getWikipediaKnowledge, detectWikipediaIntent } from '@/lib/wikipediaService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || searchParams.get('query') || 'Artificial intelligence';
    const lang = (searchParams.get('lang') === 'hi' ? 'hi' : 'en') as 'en' | 'hi';

    const intent = detectWikipediaIntent(q);
    const result = await getWikipediaKnowledge(intent.searchTerm || q, lang || intent.language);

    return NextResponse.json({
      status: result.found ? 'ok' : 'not_found',
      source: result.source,
      searchTerm: intent.searchTerm,
      article: result.article,
      summary: result.formattedSummary,
    });
  } catch (err: any) {
    console.error('Wikipedia API GET error:', err);
    return NextResponse.json(
      { status: 'error', error: err?.message || 'Failed to query Wikipedia' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query || body.searchTerm || '';
    const lang = (body.lang === 'hi' ? 'hi' : 'en') as 'en' | 'hi';

    const intent = detectWikipediaIntent(query);
    const result = await getWikipediaKnowledge(intent.searchTerm || query, lang || intent.language);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Wikipedia API POST error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process Wikipedia query' },
      { status: 500 }
    );
  }
}
