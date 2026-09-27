import { Invoice, InvoiceStatus, InvoiceSubtype, DepositMode } from '@/lib/data/interfaces/invoice.interface';
import { InvoiceSectionKind } from '@/lib/data/interfaces/invoice-section.interface';
import { InvoiceLineType, InvoiceUnitCode } from '@/lib/data/interfaces/invoice-line.interface';
import { VatRateBreakdown } from '@/lib/services/billing-calculator';

export interface ClientSectionDTO {
  id: string;
  parentSectionId?: string | null;
  kind: InvoiceSectionKind;
  title: string;
  description?: string | null;
  position: number;
  isOptional: boolean;
  optionGroupKey?: string | null;
  isSelected: boolean;
}

export interface ClientLineDTO {
  id: string;
  sectionId?: string | null;
  description: string;
  quantity: number;
  unitCode: InvoiceUnitCode;
  unitPrice: number;
  discountRate: number;
  taxRate: number;
  taxAmount: number;
  totalHT: number;
  totalTTC: number;
  lineType: InvoiceLineType;
  position: number;
}

export interface ClientQuoteDTO {
  id: string;
  organizationId: string;
  type: 'quote';
  number: string;
  title?: string | null;
  date: string;
  validUntil?: string | null;
  status: InvoiceStatus;
  message?: string | null;
  grossHT: number;
  discountAmount: number;
  totalHT: number;
  taxAmount: number;
  totalTTC: number;
  sections: ClientSectionDTO[];
  lines: ClientLineDTO[];
  vatBreakdown: VatRateBreakdown[];
  depositMode: DepositMode;
  depositRate?: number | null;
  depositFixedAmount?: number | null;
  depositAmount: number;
  signature?: string | null;
  signatureDate?: string | null;
  signedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  revisionNumber?: number;
  supersedesDocumentId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ClientInvoiceDTO {
  id: string;
  organizationId: string;
  type: 'invoice';
  number: string;
  title?: string | null;
  date: string;
  dueDate?: string | null;
  status: InvoiceStatus;
  invoiceSubtype: InvoiceSubtype;
  sourceQuoteId?: string | null;
  message?: string | null;
  totalHT: number;
  taxAmount: number;
  totalTTC: number;
  prepaidAmount: number;
  amountDue: number;
  sections: ClientSectionDTO[];
  lines: ClientLineDTO[];
  vatBreakdown: VatRateBreakdown[];
  paidAt?: string | null;
  paymentLink?: string | null;
  createdAt: string;
}

/**
 * Transforms an internal quote to a client-safe DTO.
 * Explicit allowlist: unitCost, margins, and internal profitability metrics are completely removed.
 */
export function toClientQuoteDTO(
  invoice: Invoice,
  vatBreakdown: VatRateBreakdown[]
): ClientQuoteDTO {
  let grossHT = 0;
  let discountAmount = 0;
  for (const l of invoice.lines ?? []) {
    const qty = Number(l.quantity) || 0;
    const price = Number(l.unitPrice) || 0;
    const disc = Number(l.discountRate ?? l.discount ?? 0);
    const lineGross = Math.round(qty * price * 100) / 100;
    const lineDisc = Math.round(lineGross * (disc / 100) * 100) / 100;
    grossHT += lineGross;
    discountAmount += lineDisc;
  }
  grossHT = Math.round(grossHT * 100) / 100;
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    id: invoice.id,
    organizationId: invoice.organizationId,
    type: 'quote',
    number: invoice.number,
    title: invoice.title ?? null,
    date: invoice.date,
    validUntil: invoice.validUntil ?? null,
    status: invoice.status,
    message: invoice.message ?? null,
    grossHT,
    discountAmount,
    totalHT: invoice.totalHT,
    taxAmount: invoice.taxAmount,
    totalTTC: invoice.totalTTC,
    sections: (invoice.sections ?? []).map(s => ({
      id: s.id,
      parentSectionId: s.parentSectionId ?? null,
      kind: s.kind,
      title: s.title,
      description: s.description ?? null,
      position: s.position,
      isOptional: s.isOptional,
      optionGroupKey: s.optionGroupKey ?? null,
      isSelected: s.isSelected,
    })),
    lines: (invoice.lines ?? []).map(l => ({
      id: l.id,
      sectionId: l.sectionId ?? null,
      description: l.description,
      quantity: l.quantity,
      unitCode: (l.unitCode ?? 'unit') as InvoiceUnitCode,
      unitPrice: l.unitPrice,
      discountRate: l.discountRate ?? l.discount ?? 0,
      taxRate: l.taxRate,
      taxAmount: l.taxAmount ?? 0,
      totalHT: l.totalHT,
      totalTTC: l.totalTTC,
      lineType: (l.lineType ?? 'service') as InvoiceLineType,
      position: l.position ?? 0,
    })),
    vatBreakdown,
    depositMode: (invoice.depositMode ?? 'none') as DepositMode,
    depositRate: invoice.depositRate ?? null,
    depositFixedAmount: invoice.depositFixedAmount ?? null,
    depositAmount: invoice.depositAmount ?? 0,
    signature: invoice.signature ?? null,
    signatureDate: invoice.signatureDate ?? null,
    signedAt: invoice.signedAt ?? null,
    acceptedAt: invoice.acceptedAt ?? null,
    rejectedAt: invoice.rejectedAt ?? null,
    revisionNumber: invoice.revisionNumber,
    supersedesDocumentId: invoice.supersedesDocumentId ?? null,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

/**
 * Transforms an internal invoice to a client-safe DTO.
 */
export function toClientInvoiceDTO(
  invoice: Invoice,
  vatBreakdown: VatRateBreakdown[]
): ClientInvoiceDTO {
  return {
    id: invoice.id,
    organizationId: invoice.organizationId,
    type: 'invoice',
    number: invoice.number,
    title: invoice.title ?? null,
    date: invoice.date,
    dueDate: invoice.dueDate ?? null,
    status: invoice.status,
    invoiceSubtype: (invoice.invoiceSubtype ?? 'standard') as InvoiceSubtype,
    sourceQuoteId: invoice.sourceQuoteId ?? null,
    message: invoice.message ?? null,
    totalHT: invoice.totalHT,
    taxAmount: invoice.taxAmount,
    totalTTC: invoice.totalTTC,
    prepaidAmount: invoice.prepaidAmount ?? 0,
    amountDue: invoice.amountDue ?? invoice.totalTTC,
    sections: (invoice.sections ?? []).map(s => ({
      id: s.id,
      parentSectionId: s.parentSectionId ?? null,
      kind: s.kind,
      title: s.title,
      description: s.description ?? null,
      position: s.position,
      isOptional: s.isOptional,
      optionGroupKey: s.optionGroupKey ?? null,
      isSelected: s.isSelected,
    })),
    lines: (invoice.lines ?? []).map(l => ({
      id: l.id,
      sectionId: l.sectionId ?? null,
      description: l.description,
      quantity: l.quantity,
      unitCode: (l.unitCode ?? 'unit') as InvoiceUnitCode,
      unitPrice: l.unitPrice,
      discountRate: l.discountRate ?? l.discount ?? 0,
      taxRate: l.taxRate,
      taxAmount: l.taxAmount ?? 0,
      totalHT: l.totalHT,
      totalTTC: l.totalTTC,
      lineType: (l.lineType ?? 'service') as InvoiceLineType,
      position: l.position ?? 0,
    })),
    vatBreakdown,
    paidAt: invoice.paidAt ?? null,
    paymentLink: invoice.paymentLink ?? null,
    createdAt: invoice.createdAt,
  };
}
