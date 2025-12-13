import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getR2Config() {
  if (!process.env.R2_ACCOUNT_ID) {
    throw new Error('Please add R2_ACCOUNT_ID to .env');
  }

  if (!process.env.R2_ACCESS_KEY_ID) {
    throw new Error('Please add R2_ACCESS_KEY_ID to .env');
  }

  if (!process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('Please add R2_SECRET_ACCESS_KEY to .env');
  }

  if (!process.env.R2_BUCKET_NAME) {
    throw new Error('Please add R2_BUCKET_NAME to .env');
  }

  return {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
  };
}

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    const config = getR2Config();
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return r2Client;
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<string> {
  const config = getR2Config();
  const client = getR2Client();
  
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);
  
  const publicUrl = process.env.R2_PUBLIC_URL 
    ? `${process.env.R2_PUBLIC_URL}/${key}`
    : `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${key}`;
  
  return publicUrl;
}

export async function getR2SignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const config = getR2Config();
  const client = getR2Client();
  
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

export async function deleteFromR2(key: string): Promise<void> {
  const config = getR2Config();
  const client = getR2Client();
  
  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  await client.send(command);
}

