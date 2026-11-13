import 'server-only';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let client: S3Client | undefined;
function s3() {
  if (!process.env.AWS_ENDPOINT_URL_S3 || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) throw new Error('Private object storage configuration missing');
  return client ??= new S3Client({ forcePathStyle: true, endpoint: process.env.AWS_ENDPOINT_URL_S3, region: process.env.AWS_REGION });
}

/** Internal byte transport. Domain adapters must authorize before every call. */
export const objectStore = {
  async put(bucket: string, key: string, bytes: Buffer, contentType: string) {
    await s3().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType, IfNoneMatch: '*' }));
  },
  async read(bucket: string, key: string): Promise<Buffer> {
    const result = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result.Body) throw new Error('Object unavailable');
    return Buffer.from(await result.Body.transformToByteArray());
  },
  async presign(bucket: string, key: string, expiresIn = 60) {
    if (expiresIn < 1 || expiresIn > 60) throw new Error('Invalid private download lifetime');
    return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
  },
  async removeOrphan(bucket: string, key: string) {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },
};
