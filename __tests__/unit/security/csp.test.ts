import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, createNonce, wantsDocumentCsp } from '@/lib/security/csp';

describe('content security policy', () => {
  it('allows scripts only by nonce in production', () => {
    const policy = buildContentSecurityPolicy('abc', false);
    const scripts = policy.split('; ').find((directive) => directive.startsWith('script-src'));
    expect(scripts).toContain("'nonce-abc'");
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toMatch(/'unsafe-eval'/);
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it('keeps eval only for the development overlay', () => {
    expect(buildContentSecurityPolicy('abc', true)).toContain("'unsafe-eval'");
  });

  it('creates a fresh, unguessable nonce per request', () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(atob(a)).toHaveLength(16);
  });

  it('targets HTML documents, not server actions or prefetches', () => {
    expect(wantsDocumentCsp('GET', new Headers())).toBe(true);
    expect(wantsDocumentCsp('POST', new Headers())).toBe(false);
    expect(wantsDocumentCsp('GET', new Headers({ 'next-router-prefetch': '1' }))).toBe(false);
  });
});
