import { describe, it, expect, vi } from 'vitest';
import { TaxService } from '@/lib/services/tax.service';
import * as complianceService from '@/lib/services/compliance.service';
import * as vatValidator from '@/lib/utils/vat-validator';
import type { CountryComplianceProfile } from '@/lib/data/interfaces';
import type { VatValidationResult } from '@/lib/services/tax.types';

vi.mock('@/lib/services/compliance.service', () => ({
  getComplianceProfile: vi.fn(),
}));

vi.mock('@/lib/utils/vat-validator', () => ({
  validateVatNumber: vi.fn(),
}));

const mockProfile = (vatStandard: number, country = 'FR'): CountryComplianceProfile => ({
  id: 'test-profile-id',
  country,
  version: '1.0',
  effectiveFrom: '2026-01-01',
  vatStandard,
  retentionYears: 10,
  einvoiceMandatory: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const mockVatResult = (valid: boolean): VatValidationResult => ({
  valid,
  validationDate: new Date(),
});

describe('Tax Service – Compliance Tests', () => {
  const taxService = new TaxService();

  it('FR domestic B2B should apply 20% VAT', async () => {
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue(mockProfile(20, 'FR'));
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
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue(mockProfile(20, 'FR'));
    vi.mocked(vatValidator.validateVatNumber).mockResolvedValue(mockVatResult(true));
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
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue(mockProfile(20, 'FR'));
    vi.mocked(vatValidator.validateVatNumber).mockResolvedValue(mockVatResult(false));
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
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue(mockProfile(19, 'DE'));
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
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue(mockProfile(21, 'BE'));
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
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue(mockProfile(17, 'LU'));
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
