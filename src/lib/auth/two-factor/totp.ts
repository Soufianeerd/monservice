import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** TOTP (RFC 6238) : HMAC-SHA1, 6 chiffres, pas de 30 s — le standard des applications d'authentification. */
export const TOTP_PERIOD_SECONDS = 30;
const DIGITS = 6;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error('Invalid base32 secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Secret de 160 bits, encodé en base32 pour l'application d'authentification. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpStep(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS);
}

export function totpCode(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Vérifie un code en tolérant un pas d'écart (horloge du téléphone).
 * Renvoie le pas reconnu, que la base consomme pour interdire la réutilisation.
 */
export function verifyTotp(secret: string, code: string, nowMs: number = Date.now()): number | null {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return null;
  const current = totpStep(nowMs);
  let matched: number | null = null;
  for (const step of [current - 1, current, current + 1]) {
    const expected = Buffer.from(totpCode(secret, step));
    // Comparaison à temps constant ; on parcourt toujours les trois pas.
    if (timingSafeEqual(expected, Buffer.from(normalized)) && matched === null) matched = step;
  }
  return matched;
}

export function otpauthUri(secret: string, account: string, issuer = 'MonService'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(TOTP_PERIOD_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}
