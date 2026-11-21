// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('@/lib/db/server', () => ({ db: { execute } }));

import { allowAttempt, clientIpFrom } from '@/lib/auth/shared-rate-limit';
import { guardAuthRequest } from '@/lib/auth/api-guard';

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://app.test/api/auth/x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } });

describe('limite de tentatives partagée', () => {
  afterEach(() => { execute.mockReset(); vi.unstubAllEnvs(); });

  it('autorise puis refuse selon la base', async () => {
    vi.stubEnv('RATE_LIMIT_DISABLED', '');
    execute.mockResolvedValueOnce([{ allowed: true }]).mockResolvedValueOnce([{ allowed: false }]);
    expect(await allowAttempt('sign-in:email', 'A@B.fr', 10, 900)).toBe(true);
    expect(await allowAttempt('sign-in:email', 'a@b.fr', 10, 900)).toBe(false);
  });

  it('ne stocke jamais la clé en clair', async () => {
    vi.stubEnv('RATE_LIMIT_DISABLED', '');
    execute.mockResolvedValue([{ allowed: true }]);
    await allowAttempt('sign-in:email', 'secret@exemple.fr', 10, 900);
    expect(JSON.stringify(execute.mock.calls[0])).not.toContain('secret@exemple.fr');
  });

  it('base indisponible : la tentative passe (limite du proxy toujours active)', async () => {
    vi.stubEnv('RATE_LIMIT_DISABLED', '');
    execute.mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await allowAttempt('sign-in:ip', '203.0.113.1', 30, 900)).toBe(true);
  });

  it("bloque la connexion d'un compte après trop d'échecs (429)", async () => {
    vi.stubEnv('RATE_LIMIT_DISABLED', '');
    execute.mockResolvedValueOnce([{ allowed: false }]).mockResolvedValueOnce([{ allowed: true }]);
    const response = await guardAuthRequest('POST', ['sign-in', 'email'], post({ email: 'a@b.fr', password: 'x' }, { 'x-nf-client-connection-ip': '203.0.113.2' }));
    expect(response?.status).toBe(429);
  });

  it("préfère l'IP fournie par Netlify", () => {
    expect(clientIpFrom(new Headers({ 'x-forwarded-for': '1.1.1.1', 'x-nf-client-connection-ip': '203.0.113.9' }))).toBe('203.0.113.9');
  });
});
