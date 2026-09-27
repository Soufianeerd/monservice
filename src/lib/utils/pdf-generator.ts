import React from 'react';
import { pdf, type DocumentProps } from '@react-pdf/renderer';
import { InvoicePDF, type InvoicePDFProps } from '@/components/crm/InvoicePDF';
import { QuotePDF, type QuotePDFProps } from '@/components/crm/QuotePDF';
import type { Invoice, Organization } from '@/lib/data/interfaces';

export async function generateInvoicePDF(
  invoice: Invoice,
  organization: Organization,
  client: InvoicePDFProps['client'],
  site?: InvoicePDFProps['site']
): Promise<Blob> {
  const doc = await InvoicePDF({ invoice, organization, client, site });
  return await pdf(doc as React.ReactElement<DocumentProps>).toBlob();
}

export async function generateQuotePDF(
  quote: QuotePDFProps['quote'],
  organization: Organization,
  client: QuotePDFProps['client'],
  site?: QuotePDFProps['site']
): Promise<Blob> {
  const doc = await QuotePDF({ quote, organization, client, site });
  return await pdf(doc as React.ReactElement<DocumentProps>).toBlob();
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
