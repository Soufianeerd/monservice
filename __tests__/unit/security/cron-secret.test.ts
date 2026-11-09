import { describe, it, expect } from 'vitest';
import { isValidCronSecret } from '@/lib/utils/cron-secret';

describe('isValidCronSecret', () => {
  const expected = 'a'.repeat(64);

  it('accepts the exact configured secret', () => {
    expect(isValidCronSecret(expected, expected)).toBe(true);
  });

  it('rejects a wrong secret of the same length', () => {
    expect(isValidCronSecret('b'.repeat(64), expected)).toBe(false);
  });

  it('rejects a prefix or a longer value', () => {
    expect(isValidCronSecret(expected.slice(0, 10), expected)).toBe(false);
    expect(isValidCronSecret(expected + 'x', expected)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(isValidCronSecret(null, expected)).toBe(false);
  });

  it('never authorizes when no secret is configured', () => {
    expect(isValidCronSecret('', undefined)).toBe(false);
    expect(isValidCronSecret('', '')).toBe(false);
    expect(isValidCronSecret('anything', '')).toBe(false);
  });
});
