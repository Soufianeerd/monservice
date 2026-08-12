export interface InvoiceTaxData {
  supplierCountry: string;          // 'FR', 'DE', 'BE', 'LU'
  supplierVatId?: string;
  supplierLegalEntityId?: string;
  customerCountry: string;
  customerVatId?: string;
  customerType: 'B2B' | 'B2C';
  productType?: 'goods' | 'digital_service' | 'physical_service';
  productCategory?: string;         // pour les taux réduits (ex: 'food', 'books')
  transactionDate: Date;
}

export interface VatResult {
  treatment: 'domestic' | 'reverse_charge' | 'exempt' | 'b2c_oss' | 'zero_rated';
  rate: number;
  justification: string;            // Texte explicatif (ex: "TVA 20% - France domestique")
  legalRuleVersion: string;         // ex: "FR-2026.09-v1"
  vatCode?: string;                 // Code fiscal (ex: 'FR-1' pour taux normal)
}

export interface VatValidationResult {
  valid: boolean;
  name?: string;
  address?: string;
  validationDate: Date;
  requestId?: string;
}
