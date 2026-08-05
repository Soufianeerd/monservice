import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoiceService } from '@/lib/services/invoice.service';

// Mock the database
vi.mock('@/lib/db/server', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ number: 'F-2023-0004' }])
          }))
        })),
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

describe('invoiceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate totals correctly', async () => {
    // Override select just for this test
    const { db } = await import('@/lib/db/server');
    vi.mocked(db.select).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([
          { quantity: 2, unitPrice: 100, taxRate: 20 }, // HT: 200, Tax: 40
          { quantity: 1, unitPrice: 50, taxRate: 10 }   // HT: 50, Tax: 5
        ])
      }))
    }) as any);

    const totals = await invoiceService.calculateTotals('inv_123', 'org_123');
    
    expect(totals.totalHT).toBe(250);
    expect(totals.taxAmount).toBe(45);
    expect(totals.totalTTC).toBe(295);
  });

  it('should generate next sequence number correctly', async () => {
    // db.select chain for generateNumber is mocked to return { number: 'F-2023-0004' } by default
    const year = new Date().getFullYear();
    const nextNumber = await invoiceService.generateNumber('invoice', 'org_123');
    
    expect(nextNumber).toBe(`F-${year}-0005`);
  });
});
