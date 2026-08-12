import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaxService } from '@/lib/services/tax.service';
import { InvoiceTaxData } from '@/lib/services/tax.types';
import * as complianceService from '@/lib/services/compliance.service';
import * as vatValidator from '@/lib/utils/vat-validator';

vi.mock('@/lib/services/compliance.service', () => ({
  getComplianceProfile: vi.fn(),
}));

vi.mock('@/lib/utils/vat-validator', () => ({
  validateVatNumber: vi.fn(),
  checkVatFormat: vi.fn(),
}));

describe('TaxService', () => {
  let taxService: TaxService;

  beforeEach(() => {
    taxService = new TaxService();
    vi.resetAllMocks();
  });

  const mockFRProfile = {
    version: '1.0',
    vatStandard: 20,
  };

  it('should apply domestic 20% for FR B2B (same country)', async () => {
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue(mockFRProfile as any);

    const data: InvoiceTaxData = {
      supplierCountry: 'FR',
      supplierLegalEntityId: 'le-1',
      customerCountry: 'FR',
      customerType: 'B2B',
      transactionDate: new Date(),
    };

    const result = await taxService.determineVatTreatment(data);

    expect(result.treatment).toBe('domestic');
    expect(result.rate).toBe(20);
    expect(result.justification).toContain('TVA 20%');
  });

  it('should apply reverse charge for FR to DE B2B with valid VAT', async () => {
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue(mockFRProfile as any);
    vi.mocked(vatValidator.validateVatNumber).mockResolvedValue({ valid: true, validationDate: new Date() });

    const data: InvoiceTaxData = {
      supplierCountry: 'FR',
      supplierLegalEntityId: 'le-1',
      customerCountry: 'DE',
      customerVatId: 'DE123456789',
      customerType: 'B2B',
      transactionDate: new Date(),
    };

    const result = await taxService.determineVatTreatment(data);

    expect(result.treatment).toBe('reverse_charge');
    expect(result.rate).toBe(0);
    expect(result.justification).toContain('Autoliquidation');
    expect(vatValidator.validateVatNumber).toHaveBeenCalledWith('DE123456789', 'DE');
  });

  it('should apply domestic rate for FR to DE B2B with INVALID VAT', async () => {
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue(mockFRProfile as any);
    vi.mocked(vatValidator.validateVatNumber).mockResolvedValue({ valid: false, validationDate: new Date() });

    const data: InvoiceTaxData = {
      supplierCountry: 'FR',
      supplierLegalEntityId: 'le-1',
      customerCountry: 'DE',
      customerVatId: 'DE999',
      customerType: 'B2B',
      transactionDate: new Date(),
    };

    const result = await taxService.determineVatTreatment(data);

    expect(result.treatment).toBe('domestic');
    expect(result.rate).toBe(20);
  });

  it('should apply domestic rate for B2C transactions', async () => {
    vi.mocked(complianceService.getComplianceProfile).mockResolvedValue(mockFRProfile as any);

    const data: InvoiceTaxData = {
      supplierCountry: 'FR',
      supplierLegalEntityId: 'le-1',
      customerCountry: 'DE',
      customerType: 'B2C',
      transactionDate: new Date(),
    };

    const result = await taxService.determineVatTreatment(data);

    expect(result.treatment).toBe('domestic');
    expect(result.rate).toBe(20);
    expect(result.justification).toContain('Client particulier en DE');
  });
});
