import 'server-only';

/**
 * Configuration du stockage privé Neon (compatible S3).
 *
 * Les fonctions Netlify tournent sur AWS Lambda, qui réserve et remplace les
 * variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY et AWS_REGION par celles de
 * la fonction elle-même. On lit donc d'abord les noms NEON_STORAGE_*, puis les noms
 * AWS_* pour les environnements où ils restent utilisables (CI, local, Vercel).
 */
export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function readStorageConfig(env: Record<string, string | undefined> = process.env): StorageConfig | null {
  const endpoint = env.NEON_STORAGE_ENDPOINT || env.AWS_ENDPOINT_URL_S3;
  const region = env.NEON_STORAGE_REGION || env.AWS_REGION;
  const accessKeyId = env.NEON_STORAGE_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.NEON_STORAGE_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) return null;
  return { endpoint, region, accessKeyId, secretAccessKey };
}
