import { getComplianceProfile } from './compliance.service';
import { validateVatNumber } from '../utils/vat-validator';
import { VatResult, InvoiceTaxData } from './tax.types';

export class TaxService {
  async determineVatTreatment(data: InvoiceTaxData): Promise<VatResult> {
    try {
      // 1. Get supplier's compliance profile
      const supplierProfile = await getComplianceProfile(data.supplierCountry);
      
      const supplierCountry = data.supplierCountry.toUpperCase();
      const customerCountry = data.customerCountry.toUpperCase();

      // 2. Determine if B2B or B2C
      if (data.customerType === 'B2B') {
        // 2a. Intra-EU with valid VAT number? (Reverse charge)
        if (customerCountry !== supplierCountry && data.customerVatId) {
          const validation = await validateVatNumber(data.customerVatId, customerCountry);
          if (validation.valid) {
            return {
              treatment: 'reverse_charge',
              rate: 0,
              justification: `Autoliquidation - Client assujetti établi dans ${customerCountry}`,
              legalRuleVersion: supplierProfile.version,
            };
          }
        }
        // 2b. Same country (Domestic) or non-valid EU VAT
        return {
          treatment: 'domestic',
          rate: supplierProfile.vatStandard,
          justification: `TVA ${supplierProfile.vatStandard}% - ${supplierCountry} domestique`,
          legalRuleVersion: supplierProfile.version,
          vatCode: `${supplierCountry}-1`,
        };
      } else {
        // B2C
        // 3. For MVP, we apply the supplier's domestic rate (OSS is a future enhancement)
        return {
          treatment: 'domestic',
          rate: supplierProfile.vatStandard,
          justification: `TVA ${supplierProfile.vatStandard}% - Client particulier en ${customerCountry}`,
          legalRuleVersion: supplierProfile.version,
          vatCode: `${supplierCountry}-1`,
        };
      }
    } catch (error) {
      // Fallback if country profile not found
      console.warn(`TaxService fallback applied for ${data.supplierCountry}`, error);
      return {
        treatment: 'domestic',
        rate: 20, // Default generic fallback
        justification: `TVA 20% (Taux par défaut)`,
        legalRuleVersion: 'fallback-v1',
      };
    }
  }
}
