// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
const { log } = vi.hoisted(() => ({ log: vi.fn() }));
vi.mock('@/lib/services/audit.service', () => ({ AuditService: class { log = log; } }));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-nf-client-connection-ip': '203.0.113.5', 'x-forwarded-for': '1.1.1.1', 'user-agent': 'Test' }),
}));

import { recordAudit } from '@/lib/audit/record';

describe('recordAudit', () => {
  beforeEach(() => log.mockReset());

  it("écrit l'action avec l'IP fiable de l'hébergeur", async () => {
    await recordAudit({ userId: 'u1', organizationId: 'o1', action: 'document.deleted', entityType: 'invoice', entityId: 'i1' });
    expect(log).toHaveBeenCalledWith('u1', 'o1', 'document.deleted', 'invoice', 'i1', undefined, undefined, '203.0.113.5', 'Test');
  });

  it('organisation absente : null (clé étrangère)', async () => {
    await recordAudit({ userId: 'u1', action: 'privacy.personal_export', entityType: 'user' });
    expect(log.mock.calls[0][1]).toBeNull();
  });

  it("ne bloque jamais l'action si l'écriture échoue", async () => {
    log.mockRejectedValueOnce(new Error('rls'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(recordAudit({ userId: 'u1', organizationId: 'o1', action: 'x', entityType: 'y' })).resolves.toBeUndefined();
  });
});
