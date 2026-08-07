export type DealStatus = 'prospect' | 'qualification' | 'negotiation' | 'proposal' | 'won' | 'lost';

export interface Deal {
  id: string;
  name: string;
  value: number;
  status: DealStatus;
  probability?: number | null;
  clientId: string;
  organizationId: string;
  expectedCloseDate: string;
  description?: string | null;
  signature?: string | null;
  signedAt?: string | null;
  signatureToken?: string | null;
  createdAt: string;
  updatedAt: string;
}
