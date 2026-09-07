import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3StorageConfig {
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  bucket?: string;
}

let s3ClientInstance: S3Client | null = null;

export function getS3Config(): S3StorageConfig {
  return {
    endpoint: process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL || 'https://s3.amazonaws.com',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || process.env.AWS_BUCKET_NAME || 'phi-storage',
  };
}

export function isS3Configured(): boolean {
  const config = getS3Config();
  return Boolean(config.accessKeyId && config.secretAccessKey);
}

export function getS3Client(): S3Client {
  if (s3ClientInstance) return s3ClientInstance;

  const config = getS3Config();
  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new Error('S3 credentials (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY) are not configured.');
  }

  s3ClientInstance = new S3Client({
    region: config.region || 'us-east-1',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true, // required for MinIO, Cloudflare R2, Ceph, Hugging Face Hub S3 endpoints
  });

  return s3ClientInstance;
}

export async function uploadToS3(key: string, body: Buffer | Uint8Array | string, contentType: string = 'application/octet-stream') {
  const client = getS3Client();
  const config = getS3Config();
  const bucket = config.bucket || 'phi-storage';

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);

  // Generate presigned URL for secure retrieval or return direct URL
  try {
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const signedUrl = await getSignedUrl(client, getCommand, { expiresIn: 86400 * 7 }); // 7 days
    return {
      key,
      bucket,
      url: signedUrl,
      directUrl: `${config.endpoint?.replace(/\/$/, '')}/${bucket}/${key}`,
    };
  } catch {
    return {
      key,
      bucket,
      url: `${config.endpoint?.replace(/\/$/, '')}/${bucket}/${key}`,
    };
  }
}

export async function listS3Objects(prefix: string = '') {
  const client = getS3Client();
  const config = getS3Config();
  const bucket = config.bucket || 'phi-storage';

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: 50,
  });

  const response = await client.send(command);
  return response.Contents || [];
}
