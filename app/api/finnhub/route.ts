import { NextRequest, NextResponse } from 'next/server';
import { getLiveStockQuote, extractStockSymbol } from '@/lib/finnhubService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbolQuery = searchParams.get('symbol') || searchParams.get('q') || 'AAPL';
    const hasApiKey = Boolean(process.env.FINNHUB_API_KEY);

    const result = await getLiveStockQuote(symbolQuery);

    return NextResponse.json({
      status: 'ok',
      configured: hasApiKey,
      source: result.source,
      symbol: result.symbol,
      quote: result.quote,
      summary: result.formattedSummary,
    });
  } catch (err: any) {
    console.error('Finnhub API GET error:', err);
    return NextResponse.json(
      { status: 'error', error: err?.message || 'Failed to fetch stock quote' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query || body.symbol || 'AAPL';
    const result = await getLiveStockQuote(query);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Finnhub API POST error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process stock query' },
      { status: 500 }
    );
  }
}
