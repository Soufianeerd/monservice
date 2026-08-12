export interface ConsentEvent {
  id: string;
  userId?: string | null;
  organizationId?: string | null;
  consentType: string;
  consentValue: string;
  legalBasis?: string | null;
  source?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  policyVersion?: string | null;
  timestamp: string;
}
