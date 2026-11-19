import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { resetRateLimitStoreForTesting, sensitiveRateLimit } from '@/middleware/rate-limit';

function post(path: string, ip = '203.0.113.7') {
  return new NextRequest(`https://app.test${path}`, { method: 'POST', headers: { 'x-forwarded-for': ip } });
}

describe('sensitiveRateLimit', () => {
  beforeEach(() => resetRateLimitStoreForTesting());

  it('limite les créations de compte par adresse IP', () => {
    for (let i = 0; i < 5; i += 1) expect(sensitiveRateLimit(post('/api/auth/sign-up/email'))).toBeNull();
    expect(sensitiveRateLimit(post('/api/auth/sign-up/email'))?.status).toBe(429);
    expect(sensitiveRateLimit(post('/api/auth/sign-up/email', '198.51.100.1'))).toBeNull();
  });

  it('compte chaque catégorie séparément', () => {
    for (let i = 0; i < 5; i += 1) sensitiveRateLimit(post('/api/auth/sign-up/email'));
    expect(sensitiveRateLimit(post('/api/auth/sign-in/email'))).toBeNull();
  });

  it('ignore les lectures et les chemins non sensibles', () => {
    const get = new NextRequest('https://app.test/api/auth/sign-up/email', { method: 'GET' });
    for (let i = 0; i < 20; i += 1) expect(sensitiveRateLimit(get)).toBeNull();
    for (let i = 0; i < 20; i += 1) expect(sensitiveRateLimit(post('/api/invoices/abc/send'))).toBeNull();
  });

  it("limite le dépôt d'avis public", () => {
    for (let i = 0; i < 10; i += 1) expect(sensitiveRateLimit(post('/laisser-un-avis'))).toBeNull();
    expect(sensitiveRateLimit(post('/laisser-un-avis'))?.status).toBe(429);
  });
});
