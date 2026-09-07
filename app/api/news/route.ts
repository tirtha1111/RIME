import { NextRequest, NextResponse } from 'next/server';
import { getLiveNews, detectNewsIntent } from '@/lib/newsService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || undefined;
    const category = searchParams.get('category') || undefined;
    const country = searchParams.get('country') || 'in';
    const pageSize = parseInt(searchParams.get('pageSize') || '5', 10);

    const hasApiKey = Boolean(process.env.NEWS_API_KEY);

    const result = await getLiveNews({
      query: q,
      category,
      country,
      pageSize,
    });

    return NextResponse.json({
      status: 'ok',
      configured: hasApiKey,
      sourceType: result.sourceType,
      totalResults: result.totalResults,
      articles: result.articles,
      summary: result.formattedSummary,
    });
  } catch (err: any) {
    console.error('News API route error:', err);
    return NextResponse.json(
      { status: 'error', error: err?.message || 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query || '';
    const intent = detectNewsIntent(query);

    const result = await getLiveNews({
      query: intent.topic || body.query,
      category: intent.category || body.category,
      country: intent.country || body.country || 'in',
      pageSize: body.pageSize || 5,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('News API POST error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process news query' },
      { status: 500 }
    );
  }
}
