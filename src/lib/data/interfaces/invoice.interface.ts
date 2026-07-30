import { InvoiceLine } from './invoice-line.interface';

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  organizationId: string;
  type: 'invoice' | 'quote';
  number: string;
  date: string;
  dueDate?: string | null;
  paidAt?: string | null;
  paymentLink?: string | null;
  stripePaymentIntentId?: string | null;
  paymentIntentId?: string | null;
  clientId: string;
  requestId?: string | null;
  professionalId?: string | null;
  message?: string | null;
  lines: InvoiceLine[];
  totalHT: number;
  taxAmount: number;
  totalTTC: number;
  status: InvoiceStatus;
  
  // Signature
  signature?: string | null;
  signatureDate?: string | null;
  signatureIp?: string | null;
  signedAt?: string | null;

  createdAt: string;
  updatedAt: string;
}
