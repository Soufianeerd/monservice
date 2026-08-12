import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '@/lib/services/audit.service';

vi.mock('@/lib/db/server', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue(true)
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue([
            { id: '1', action: 'login', userId: 'user1', createdAt: new Date() },
            { id: '2', action: 'create', userId: 'user1', createdAt: new Date() }
          ])
        }))
      }))
    })),
  }
}));

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    auditService = new AuditService();
  });

  it('should log an action', async () => {
    const { db } = await import('@/lib/db/server');
    await auditService.log('user1', 'org1', 'delete', 'invoice', 'inv1');
    expect(db.insert).toHaveBeenCalled();
  });

  it('should export logs in CSV format', async () => {
    const csv = await auditService.exportLogs('org1', 'csv');
    expect(csv).toContain('Date;Utilisateur;Action');
    expect(csv).toContain('login');
    expect(csv).toContain('create');
  });
});
