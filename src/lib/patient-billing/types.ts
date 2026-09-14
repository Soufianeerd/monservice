import type { Invoice, InvoiceLine } from '@/lib/data/interfaces';

export interface PatientBillingLinkDTO {
  id: string;
  organizationId: string;
  patientId: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientInvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface CreatePatientInvoiceInput {
  patientId: string;
  dueDate: string;
  lines: PatientInvoiceLineInput[];
  notes?: string;
}

export interface PatientInvoiceDTO {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: Invoice['status'];
  totalHT: number;
  totalTTC: number;
  currency: string;
  recipientUserId: string | null;
  patientId: string;
  lines: InvoiceLine[];
}
