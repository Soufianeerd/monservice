export interface CountryComplianceProfile {
  id: string;
  country: string;
  version: string;
  effectiveFrom: string;
  vatStandard: number;
  vatReduced?: number | null;
  vatReduced2?: number | null;
  vatReduced3?: number | null;
  retentionYears: number;
  einvoiceMandatory: boolean;
  einvoiceFormat?: string | null;
  einvoiceNetwork?: string | null;
  legalMentions?: string | null;
  marketingRule?: string | null;
  privacyAuthority?: string | null;
  dpoThreshold?: number | null;
  archivingRequirements?: string | null;
  createdAt: string;
  updatedAt: string;
}
