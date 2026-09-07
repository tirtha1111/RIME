import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { roomName = 'phi-ai-room', participantName = 'Host-User', metadata } = await req.json();

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json(
        { 
          error: 'LiveKit credentials missing. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in environment variables.',
          configured: false 
        },
        { status: 401 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName || `user-${Math.random().toString(36).substring(7)}`,
      name: participantName || 'Guest User',
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: livekitUrl,
      roomName,
      configured: true,
    });
  } catch (err: any) {
    console.error('Failed to create LiveKit token:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create LiveKit token' },
      { status: 500 }
    );
  }
}
