import { NextRequest, NextResponse } from 'next/server';
import { isS3Configured, getS3Config, uploadToS3, listS3Objects } from '@/lib/s3Storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configured = isS3Configured();
    const config = getS3Config();

    if (!configured) {
      return NextResponse.json({
        configured: false,
        message: 'S3 storage credentials not configured. Provide S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY in Settings > Secrets.',
        config: {
          endpoint: config.endpoint,
          region: config.region,
          bucket: config.bucket,
        }
      });
    }

    const items = await listS3Objects();
    return NextResponse.json({
      configured: true,
      bucket: config.bucket,
      endpoint: config.endpoint,
      items: items.map(item => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
      }))
    });
  } catch (err: any) {
    console.error('S3 status/list error:', err);
    return NextResponse.json({
      configured: isS3Configured(),
      error: err.message || 'Error communicating with S3 storage'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isS3Configured()) {
      return NextResponse.json({
        error: 'S3 storage is not configured. Please set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY in Settings > Secrets.'
      }, { status: 400 });
    }

    const body = await req.json();
    const { key, data, contentType = 'application/json' } = body;

    if (!key || !data) {
      return NextResponse.json({ error: 'Both "key" and "data" are required to upload.' }, { status: 400 });
    }

    let buffer: Buffer;
    if (typeof data === 'string' && data.startsWith('data:')) {
      // Base64 data URL
      const base64Part = data.split(',')[1];
      buffer = Buffer.from(base64Part, 'base64');
    } else if (typeof data === 'string') {
      buffer = Buffer.from(data, 'utf-8');
    } else {
      buffer = Buffer.from(JSON.stringify(data), 'utf-8');
    }

    const result = await uploadToS3(key, buffer, contentType);
    return NextResponse.json({ status: 'ok', result });
  } catch (err: any) {
    console.error('S3 upload error:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload to S3' }, { status: 500 });
  }
}
