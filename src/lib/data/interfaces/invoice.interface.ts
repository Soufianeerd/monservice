import { InvoiceLine } from './invoice-line.interface';
import { InvoiceSection } from './invoice-section.interface';

export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'superseded'
  | 'cancelled';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'accepted' // backward compatibility
  | 'rejected'
  | 'superseded'
  | 'pending'
  | 'unpaid';

export type InvoiceSubtype = 'standard' | 'deposit' | 'final';
export type DepositMode = 'none' | 'percentage' | 'fixed';

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
  sections?: InvoiceSection[];
  client?: {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    zipCode?: string;
    country?: string;
  };
  site?: {
    id?: string;
    name?: string;
    address?: string;
    city?: string;
    zipCode?: string;
  };
  totalHT: number;
  taxAmount: number;
  totalTTC: number;
  status: InvoiceStatus;

  // Session 18 Fields
  createdByUserId?: string | null;
  dealId?: string | null;
  siteId?: string | null;
  workOrderId?: string | null;
  sourceQuoteId?: string | null;
  title?: string | null;
  validUntil?: string | null;
  acceptedAt?: string | null;
  acceptedByUserId?: string | null;
  rejectedAt?: string | null;
  rejectedByUserId?: string | null;
  revisionNumber?: number;
  supersedesDocumentId?: string | null;
  invoiceSubtype?: InvoiceSubtype;
  depositMode?: DepositMode;
  depositRate?: number | null;
  depositFixedAmount?: number | null;
  depositAmount?: number;
  prepaidAmount?: number;
  amountDue?: number;
  
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
