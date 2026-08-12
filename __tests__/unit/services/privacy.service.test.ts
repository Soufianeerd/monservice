import { vi, describe, it, expect, beforeEach } from 'vitest';
vi.mock('server-only', () => ({}));
import { PrivacyService } from '@/lib/services/privacy.service';
import { db } from '@/lib/db/server';

// Mock DB
vi.mock('@/lib/db/server', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  }
}));

describe('PrivacyService', () => {
  let privacyService: PrivacyService;

  beforeEach(() => {
    privacyService = new PrivacyService();
    vi.clearAllMocks();
  });

  it('should record a consent event', async () => {
    await privacyService.recordConsent('user1', 'org1', 'marketing', true, {
      ip: '127.0.0.1',
      userAgent: 'Mozilla',
    });

    expect(db.insert).toHaveBeenCalled();
  });

  it('should export CSV format correctly', async () => {
    // Mock the db return
    ((db as any).where as any).mockResolvedValueOnce([
      { name: 'Support', purpose: 'Help users', legalBasis: 'Contract', retentionPeriod: '1 yr', responsible: 'Admin' }
    ]);

    const csv = await privacyService.exportRegisterCSV('org1');
    expect(csv).toContain('Name,Purpose,Legal Basis,Retention Period,Responsible');
    expect(csv).toContain('"Support","Help users","Contract","1 yr","Admin"');
  });
});
