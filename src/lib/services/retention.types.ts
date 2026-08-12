export interface ArchivedDocument {
  id: string;
  documentId: string;
  documentType: 'invoice' | 'quote';
  organizationId: string;
  retentionDate: Date;
  archivedAt: Date;
  anonymized: boolean;
  expirationStatus: 'pending' | 'expired' | 'anonymized';
  notes?: string | null;
}

export interface RetentionPolicy {
  id: string;
  country: string;
  years: number;
  description?: string | null;
  createdAt: Date;
}
