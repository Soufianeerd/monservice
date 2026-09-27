import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoiceService } from '@/lib/services/invoice.service';
import { db } from '@/lib/db/server';

const { mockSelect, mockTransaction } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockTransaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) => callback({})),
}));

// Mock quote.service for allocateBillingNumber
vi.mock('@/lib/services/quote.service', () => ({
  allocateBillingNumber: vi.fn().mockImplementation(async (_tx, _orgId, type) => {
    const year = new Date().getFullYear();
    const prefix = type === 'invoice' ? 'F' : 'D';
    return `${prefix}-${year}-0005`;
  }),
}));

// Mock the database
vi.mock('@/lib/db/server', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    })),
    transaction: (callback: (tx: unknown) => Promise<unknown>) => mockTransaction(callback),
  },
}));

describe('invoiceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate totals correctly with tenant protection and discounts', async () => {
    const mockInvoice = {
      id: 'inv_123',
      organizationId: 'org_123',
      depositMode: 'none',
      depositRate: 0,
      depositFixedAmount: 0,
      prepaidAmount: 0,
    };

    const mockLines = [
      { id: 'line_1', quantity: 2, unitPrice: 100, taxRate: 20, discountRate: 10 }, // Gross 200, Disc 20, Net 180, Tax 36, TTC 216
      { id: 'line_2', quantity: 1, unitPrice: 50, taxRate: 10, discountRate: 0 },   // Gross 50, Disc 0, Net 50, Tax 5, TTC 55
    ];

    let selectCallCount = 0;
    mockSelect.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Query for invoice tenant check
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([mockInvoice]),
            })),
          })),
        };
      } else {
        // Query for invoice lines
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue(mockLines),
            })),
          })),
        };
      }
    });

    const totals = await invoiceService.calculateTotals('inv_123', 'org_123');

    // 180 + 50 = 230 HT
    // 36 + 5 = 41 Tax
    // 216 + 55 = 271 TTC
    expect(totals.totalHT).toBe(230);
    expect(totals.taxAmount).toBe(41);
    expect(totals.totalTTC).toBe(271);
    expect(totals.amountDue).toBe(271);
  });

  it('should reject calculation if invoice belongs to another tenant', async () => {
    mockSelect.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]), // Empty: not found for org
        })),
      })),
    }));

    await expect(invoiceService.calculateTotals('inv_cross_tenant', 'org_123')).rejects.toThrow(
      'Document introuvable dans cette organisation'
    );
  });

  it('should generate next sequence number atomically', async () => {
    const year = new Date().getFullYear();
    const nextNumber = await invoiceService.generateNumber('invoice', 'org_123');

    expect(nextNumber).toBe(`F-${year}-0005`);
  });
});
