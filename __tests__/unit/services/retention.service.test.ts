import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retentionService } from '@/lib/services/retention.service';

// Mock the database
vi.mock('@/lib/db/server', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([
          { 
            id: 'inv_123', 
            organizationId: 'org_123',
            type: 'invoice',
            date: '2023-01-01T00:00:00.000Z',
            supplierCountry: 'FR',
            lockedAt: null
          }
        ])
      }))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn()
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn()
    }))
  }
}));

describe('retentionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate retention date correctly for France (10 years)', async () => {
    const retentionDate = await retentionService.calculateRetentionDate('inv_123', 'FR');
    expect(retentionDate.getFullYear()).toBe(2033);
  });

  it('should calculate retention date correctly for Germany (8 years)', async () => {
    const retentionDate = await retentionService.calculateRetentionDate('inv_123', 'DE');
    expect(retentionDate.getFullYear()).toBe(2031);
  });

  it('should lock document and set retention date', async () => {
    const { db } = await import('@/lib/db/server');
    await retentionService.lockDocument('inv_123', 'invoice');
    expect(db.update).toHaveBeenCalled();
  });

  it('should anonymize expired documents', async () => {
    const { db } = await import('@/lib/db/server');
    await retentionService.anonymizeDocument('inv_123', 'invoice');
    expect(db.update).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
  });
});
