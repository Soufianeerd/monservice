import { describe, it, expect, vi } from 'vitest';
import { TaxService } from '@/lib/services/tax.service';
import * as complianceService from '@/lib/services/compliance.service';
import * as vatValidator from '@/lib/utils/vat-validator';

vi.mock('@/lib/services/compliance.service', () => ({
  getComplianceProfile: vi.fn(),
}));

vi.mock('@/lib/utils/vat-validator', () => ({
  validateVatNumber: vi.fn(),
}));

describe('Tax Service – Compliance Tests', () => {
  const taxService = new TaxService();

  it('FR domestic B2B should apply 20% VAT', async () => {
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue({ vatStandard: 20 } as any);
    const result = await taxService.determineVatTreatment({
      supplierCountry: 'FR',
      customerCountry: 'FR',
      customerType: 'B2B',
      transactionDate: new Date(),
    });
    expect(result.treatment).toBe('domestic');
    expect(result.rate).toBe(20);
  });

  it('FR → DE B2B with valid VAT should apply reverse charge', async () => {
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue({ vatStandard: 20 } as any);
    vi.mocked(vatValidator.validateVatNumber).mockResolvedValue({ valid: true } as any);
    const result = await taxService.determineVatTreatment({
      supplierCountry: 'FR',
      customerCountry: 'DE',
      customerVatId: 'DE123456789',
      customerType: 'B2B',
      transactionDate: new Date(),
    });
    expect(result.treatment).toBe('reverse_charge');
    expect(result.rate).toBe(0);
    expect(result.justification).toContain('Autoliquidation');
  });

  it('FR → DE B2B without valid VAT should apply domestic rate', async () => {
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue({ vatStandard: 20 } as any);
    vi.mocked(vatValidator.validateVatNumber).mockResolvedValue({ valid: false } as any);
    const result = await taxService.determineVatTreatment({
      supplierCountry: 'FR',
      customerCountry: 'DE',
      customerVatId: 'INVALID',
      customerType: 'B2B',
      transactionDate: new Date(),
    });
    expect(result.treatment).toBe('domestic');
    expect(result.rate).toBe(20);
  });

  it('DE domestic B2B should apply 19% VAT', async () => {
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue({ vatStandard: 19 } as any);
    const result = await taxService.determineVatTreatment({
      supplierCountry: 'DE',
      customerCountry: 'DE',
      customerType: 'B2B',
      transactionDate: new Date(),
    });
    expect(result.treatment).toBe('domestic');
    expect(result.rate).toBe(19);
  });

  it('BE domestic B2B should apply 21% VAT', async () => {
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue({ vatStandard: 21 } as any);
    const result = await taxService.determineVatTreatment({
      supplierCountry: 'BE',
      customerCountry: 'BE',
      customerType: 'B2B',
      transactionDate: new Date(),
    });
    expect(result.treatment).toBe('domestic');
    expect(result.rate).toBe(21);
  });

  it('LU domestic B2B should apply 17% VAT', async () => {
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue({ vatStandard: 17 } as any);
    const result = await taxService.determineVatTreatment({
      supplierCountry: 'LU',
      customerCountry: 'LU',
      customerType: 'B2B',
      transactionDate: new Date(),
    });
    expect(result.treatment).toBe('domestic');
    expect(result.rate).toBe(17);
  });
});
