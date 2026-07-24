import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/crm/InvoicePDF';
import { QuotePDF } from '@/components/crm/QuotePDF';
import { Invoice, Deal, Organization } from '@/lib/data/interfaces';

export async function generateInvoicePDF(
  invoice: Invoice,
  organization: Organization,
  client: { name: string; email?: string; address?: string }
): Promise<Blob> {
  const doc = InvoicePDF({ invoice, organization, client });
  return await pdf(doc as any).toBlob();
}

export async function generateQuotePDF(
  deal: Deal,
  organization: Organization,
  client: { name: string; email?: string; address?: string }
): Promise<Blob> {
  const doc = QuotePDF({ deal, organization, client });
  return await pdf(doc as any).toBlob();
}

export function downloadPDF(pdfBlob: Blob, filename: string): void {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
