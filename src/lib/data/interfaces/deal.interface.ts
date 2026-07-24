export type DealStatus = 'prospect' | 'qualification' | 'negotiation' | 'proposal' | 'won' | 'lost';

export interface Deal {
  id: string;
  name: string;
  value: number;
  status: DealStatus;
  clientId: string;
  organizationId: string;
  expectedCloseDate: string;
  description?: string;
  signature?: string;
  signedAt?: string;
  signatureToken?: string;
  createdAt: string;
  updatedAt: string;
}
