import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeliveryService } from '@/lib/services/delivery.service';
import { invoiceService } from '@/lib/services/invoice.service';
import { storageService } from '@/lib/storage/storage.service';
import { db } from '@/lib/db/server';

vi.mock('@/lib/services/invoice.service', () => ({
  invoiceService: {
    getById: vi.fn()
  }
}));

vi.mock('@/lib/storage/storage.service', () => {
  return {
    storageService: {
      getFileBuffer: vi.fn().mockResolvedValue(Buffer.from('<xml></xml>'))
    }
  };
});

vi.mock('@/lib/services/client.service', () => ({
  clientService: {
    findById: vi.fn().mockResolvedValue({ email: 'test@example.com' })
  }
}));

vi.mock('@/lib/db/server', () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue({})
      }))
    })),
  }
}));

describe('DeliveryService', () => {
  let deliveryService: DeliveryService;

  beforeEach(() => {
    deliveryService = new DeliveryService();
    vi.clearAllMocks();
  });

  const baseInvoice = {
    id: 'inv-1',
    number: 'F-2026-0001',
    structuredInvoicePath: 'path/to/invoice.xml',
    deliveryAttempts: 0
  };

  it('should route BE B2B customers to Peppol', async () => {
    vi.mocked(invoiceService.getById).mockResolvedValue({
      ...baseInvoice,
      customerCountry: 'BE',
      customerType: 'B2B'
    } as any);

    const result = await deliveryService.sendInvoice('inv-1');
    expect(result.channel).toBe('peppol');
    expect(result.status).toBe('sent');
  });

  it('should route FR customers to PDP', async () => {
    vi.mocked(invoiceService.getById).mockResolvedValue({
      ...baseInvoice,
      customerCountry: 'FR',
      customerType: 'B2B'
    } as any);

    const result = await deliveryService.sendInvoice('inv-1');
    expect(result.channel).toBe('pdp');
    expect(result.status).toBe('sent');
  });

  it('should route DE customers to Email', async () => {
    vi.mocked(invoiceService.getById).mockResolvedValue({
      ...baseInvoice,
      customerCountry: 'DE',
      customerType: 'B2B'
    } as any);

    const result = await deliveryService.sendInvoice('inv-1');
    expect(result.channel).toBe('email');
    expect(result.status).toBe('sent');
  });

  it('should route LU B2B customers to Email (Default)', async () => {
    vi.mocked(invoiceService.getById).mockResolvedValue({
      ...baseInvoice,
      customerCountry: 'LU',
      customerType: 'B2B'
    } as any);

    const result = await deliveryService.sendInvoice('inv-1');
    expect(result.channel).toBe('email');
    expect(result.status).toBe('sent');
  });
});
