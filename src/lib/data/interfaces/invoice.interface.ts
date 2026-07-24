import { InvoiceLine } from './invoice-line.interface';

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  organizationId: string;
  type: 'invoice' | 'quote';
  number: string;
  date: string;
  dueDate?: string;
  paidAt?: string;
  paymentLink?: string;
  stripePaymentIntentId?: string;
  clientId: string;
  lines: InvoiceLine[];
  totalHT: number;
  taxAmount: number;
  totalTTC: number;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}
