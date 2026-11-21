import 'server-only';
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Clé maîtresse de la double authentification (32 octets, base64 ou hex),
 * stable dans le temps : la changer rend illisibles les secrets enregistrés.
 */
function masterKey(): Buffer {
  const raw = process.env.TWO_FACTOR_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error('TWO_FACTOR_ENCRYPTION_KEY is not configured');
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('TWO_FACTOR_ENCRYPTION_KEY must decode to 32 bytes');
  return key;
}

function derive(purpose: string): Buffer {
  return Buffer.from(hkdfSync('sha256', masterKey(), Buffer.alloc(0), `monservice-2fa:${purpose}`, 32));
}

export function isTwoFactorConfigured(): boolean {
  try {
    masterKey();
    return true;
  } catch {
    return false;
  }
}

/** Chiffre un secret TOTP (AES-256-GCM) lié à l'utilisateur (données associées). */
export function encryptSecret(secret: string, userId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', derive('secret'), iv);
  cipher.setAAD(Buffer.from(userId));
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptSecret(payload: string, userId: string): string {
  const [version, iv, tag, data] = payload.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unsupported two-factor secret format');
  const decipher = createDecipheriv('aes-256-gcm', derive('secret'), Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(userId));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

/** Codes de secours : 10 codes de 10 caractères, seule leur empreinte est stockée. */
export function generateRecoveryCodes(count = 10): string[] {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(10);
    const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
}

export function normalizeRecoveryCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function hashRecoveryCode(code: string): string {
  return createHmac('sha256', derive('recovery')).update(normalizeRecoveryCode(code)).digest('hex');
}

/** Preuve de vérification liée à l'utilisateur ET à la session de connexion. */
export function signVerification(userId: string, sessionToken: string, expiresAt: number): string {
  const sessionHash = createHash('sha256').update(sessionToken).digest('base64url');
  return createHmac('sha256', derive('session')).update(`${userId}|${sessionHash}|${expiresAt}`).digest('base64url');
}

export function verificationMatches(userId: string, sessionToken: string, expiresAt: number, signature: string): boolean {
  const expected = Buffer.from(signVerification(userId, sessionToken, expiresAt));
  const provided = Buffer.from(signature);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
