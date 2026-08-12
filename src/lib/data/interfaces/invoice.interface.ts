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
  recipientUserId?: string | null;
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

  // Fiscal & Compliance
  legalEntityId?: string | null;
  supplierCountry?: string | null;
  supplierVatId?: string | null;
  customerCountry?: string | null;
  customerVatId?: string | null;
  customerType?: string | null;
  vatTreatment?: string | null;
  vatRate?: number | null;
  vatExemptionCode?: string | null;
  reverseCharge?: boolean | null;
  einvoiceRequired?: boolean | null;
  einvoiceFormat?: string | null;
  einvoiceProfile?: string | null;
  einvoiceNetwork?: string | null;
  structuredInvoiceHash?: string | null;
  structuredInvoicePath?: string | null;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed' | 'rejected' | string | null;
  deliveryChannel?: 'peppol' | 'pdp' | 'email' | string | null;
  deliveryTrackingId?: string | null;
  deliveryResponse?: string | null;
  deliveryAttempts?: number | null;
  deliverySentAt?: Date | string | null;
  deliveryLastAttemptAt?: Date | string | null;
  pdfHash?: string | null;
  pdfPath?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
  retentionUntil?: string | null;
  legalRuleVersion?: string | null;

  createdAt: string;
  updatedAt: string;
}
