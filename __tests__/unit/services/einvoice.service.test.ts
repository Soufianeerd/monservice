import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EinvoiceService } from '@/lib/services/einvoice.service';
import { generateUblInvoice, PopulatedInvoice } from '@/lib/services/einvoice-templates';
import * as storageService from '@/lib/storage/storage.service';
import { db } from '@/lib/db/server';
import { invoiceService } from '@/lib/services/invoice.service';
import { clientService } from '@/lib/services/client.service';
import { organizationService } from '@/lib/services/organization.service';

vi.mock('@/lib/storage/storage.service', () => ({
  storageService: {
    save: vi.fn().mockResolvedValue('test/path.xml'),
    getDownloadUrl: vi.fn(),
    getFileBuffer: vi.fn(),
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

vi.mock('@/lib/services/invoice.service', () => ({
  invoiceService: {
    getById: vi.fn()
  }
}));

vi.mock('@/lib/services/client.service', () => ({
  clientService: {
    findById: vi.fn()
  }
}));

vi.mock('@/lib/services/organization.service', () => ({
  organizationService: {
    getById: vi.fn()
  }
}));

describe('EinvoiceService', () => {
  let einvoiceService: EinvoiceService;

  beforeEach(() => {
    einvoiceService = new EinvoiceService();
    vi.clearAllMocks();
  });

  const mockInvoice = {
    id: 'inv-1',
    number: 'F-2026-0001',
    type: 'invoice',
    date: '2026-01-01',
    totalHT: 100,
    taxAmount: 20,
    totalTTC: 120,
    lines: [
      { id: 'l1', description: 'Consulting', quantity: 1, unitPrice: 100, taxRate: 20, totalHT: 100 }
    ],
    clientId: 'cli-1',
    organizationId: 'org-1'
  };

  const mockClient = { id: 'cli-1', name: 'Acme Corp', country: 'BE' };
  const mockOrg = { id: 'org-1', name: 'MonService', country: 'FR' };

  it('should generate PeppolBIS for BE B2B customers', async () => {
    vi.mocked(invoiceService.getById).mockResolvedValue({ ...mockInvoice, customerType: 'B2B' } as any);
    vi.mocked(clientService.findById).mockResolvedValue(mockClient as any);
    vi.mocked(organizationService.getById).mockResolvedValue(mockOrg as any);
    
    // @ts-ignore
    storageService.storageService.save.mockResolvedValue('path/peppol.xml');

    const result = await einvoiceService.generate('inv-1');
    
    expect(result.format).toBe('PeppolBIS');
    expect(result.path).toBe('path/peppol.xml');
    expect(result.hash).toBeDefined();
    
    if (typeof result.content === 'string') {
      expect(result.content).toContain('urn:fdc:peppol.eu:2017:poacc:billing:3.0');
    }
  });

  it('should generate Factur-X zip for FR customers', async () => {
    vi.mocked(invoiceService.getById).mockResolvedValue({ ...mockInvoice, customerType: 'B2B' } as any);
    vi.mocked(clientService.findById).mockResolvedValue({ ...mockClient, country: 'FR' } as any);
    vi.mocked(organizationService.getById).mockResolvedValue(mockOrg as any);

    const result = await einvoiceService.generate('inv-1');
    
    expect(result.format).toBe('Factur-X');
    expect(Buffer.isBuffer(result.content)).toBe(true);
  });

  it('should generate Ubl structure correctly', () => {
    const popInvoice: PopulatedInvoice = {
      ...mockInvoice,
      supplier: { name: 'MonService', country: 'FR' },
      customer: { name: 'Acme Corp', country: 'BE' }
    } as any;

    const xml = generateUblInvoice(popInvoice);
    expect(xml).toContain('<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>');
    expect(xml).toContain('<cbc:ID>F-2026-0001</cbc:ID>');
    expect(xml).toContain('Acme Corp');
    expect(xml).toContain('MonService');
  });
});
