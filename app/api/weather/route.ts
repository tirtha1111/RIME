import { NextRequest, NextResponse } from 'next/server';
import { getLiveWeather, extractLocationFromWeatherQuery } from '@/lib/weatherService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || searchParams.get('city') || 'Delhi';
    const hasApiKey = Boolean(process.env.OPENWEATHERMAP_API_KEY || process.env.OPENWEATHER_API_KEY);

    const result = await getLiveWeather(q);

    return NextResponse.json({
      status: 'ok',
      configured: hasApiKey,
      source: result.source,
      report: result.report,
    });
  } catch (err: any) {
    console.error('Weather API GET error:', err);
    return NextResponse.json(
      { status: 'error', error: err?.message || 'Failed to fetch weather' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query || body.location || body.city || 'Delhi';
    const result = await getLiveWeather(query);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Weather API POST error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process weather query' },
      { status: 500 }
    );
  }
}
