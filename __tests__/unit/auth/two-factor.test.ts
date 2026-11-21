// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import { base32Decode, base32Encode, generateTotpSecret, otpauthUri, totpCode, verifyTotp } from '@/lib/auth/two-factor/totp';
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  signVerification,
  verificationMatches,
} from '@/lib/auth/two-factor/crypto';

beforeAll(() => {
  process.env.TWO_FACTOR_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
});

describe('TOTP (RFC 6238)', () => {
  // Vecteurs officiels de la RFC 6238 (SHA1, secret ASCII "12345678901234567890"), 6 derniers chiffres.
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('matches the RFC test vector at %i s', (seconds, expected) => {
    expect(totpCode(secret, Math.floor(seconds / 30))).toBe(expected);
  });

  it('round-trips base32', () => {
    const bytes = Buffer.from('MonService 2FA');
    expect(base32Decode(base32Encode(bytes)).equals(bytes)).toBe(true);
  });

  it('accepts the current code and one step of clock drift, nothing more', () => {
    const fresh = generateTotpSecret();
    const now = 1_800_000_000_000;
    const step = Math.floor(now / 30000);
    expect(verifyTotp(fresh, totpCode(fresh, step), now)).toBe(step);
    expect(verifyTotp(fresh, totpCode(fresh, step - 1), now)).toBe(step - 1);
    expect(verifyTotp(fresh, totpCode(fresh, step + 2), now)).toBeNull();
    expect(verifyTotp(fresh, 'abcdef', now)).toBeNull();
  });

  it('builds an otpauth URI for authenticator apps', () => {
    expect(otpauthUri('ABC', 'pro@example.fr')).toBe('otpauth://totp/MonService%3Apro%40example.fr?secret=ABC&issuer=MonService&algorithm=SHA1&digits=6&period=30');
  });
});

describe('two-factor secrets and proofs', () => {
  it('encrypts secrets bound to their owner', () => {
    const payload = encryptSecret('JBSWY3DPEHPK3PXP', 'user-1');
    expect(payload).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptSecret(payload, 'user-1')).toBe('JBSWY3DPEHPK3PXP');
    expect(() => decryptSecret(payload, 'user-2')).toThrow();
  });

  it('issues unique recovery codes and hashes them independently of formatting', () => {
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
    expect(codes[0]).toMatch(/^[a-z2-9]{5}-[a-z2-9]{5}$/);
    expect(hashRecoveryCode(codes[0].toUpperCase().replace('-', ' '))).toBe(hashRecoveryCode(codes[0]));
  });

  it('binds the verification proof to the user and the session', () => {
    const expires = 2_000_000_000;
    const signature = signVerification('user-1', 'session-a', expires);
    expect(verificationMatches('user-1', 'session-a', expires, signature)).toBe(true);
    expect(verificationMatches('user-2', 'session-a', expires, signature)).toBe(false);
    expect(verificationMatches('user-1', 'session-b', expires, signature)).toBe(false);
    expect(verificationMatches('user-1', 'session-a', expires + 1, signature)).toBe(false);
  });
});
