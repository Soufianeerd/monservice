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
  paymentIntentId?: string;
  clientId: string;
  requestId?: string;
  professionalId?: string;
  message?: string;
  lines: InvoiceLine[];
  totalHT: number;
  taxAmount: number;
  totalTTC: number;
  status: InvoiceStatus;
  
  // Signature
  signature?: string;
  signatureDate?: string;
  signatureIp?: string;
  signedAt?: string;

  createdAt: string;
  updatedAt: string;
}
