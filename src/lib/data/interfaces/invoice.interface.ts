import { InvoiceLine } from './invoice-line.interface';

export type InvoiceStatus = 'draft' | 'proposal' | 'sent' | 'viewed' | 'accepted' | 'refused' | 'paid' | 'overdue' | 'expired' | 'converted';

export interface Invoice {
  id: string;
  organizationId: string;
  type: 'invoice' | 'quote';
  number: string;
  date: string;
  dueDate?: string;
  paidAt?: string;
  clientId: string;
  lines: InvoiceLine[];
  totalHT: number;
  taxAmount: number;
  totalTTC: number;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}
