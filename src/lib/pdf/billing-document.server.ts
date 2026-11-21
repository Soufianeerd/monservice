import 'server-only';
import type React from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/crm/InvoicePDF';
import { QuotePDF } from '@/components/crm/QuotePDF';
import type { Client, Invoice, Organization } from '@/lib/data/interfaces';

/**
 * PDF d'un devis ou d'une facture, généré côté serveur pour être joint à
 * l'e-mail envoyé au client (V1 : pas d'espace client, le client reçoit le
 * document lui-même).
 */
export async function renderBillingDocumentPdf(document: Invoice, organization: Organization, client: Client): Promise<Buffer> {
  const pdfClient = {
    name: client.name,
    email: client.email ?? undefined,
    phone: client.phone ?? undefined,
    address: client.address ?? undefined,
    city: client.city ?? undefined,
    zipCode: client.zipCode ?? undefined,
    country: client.country ?? undefined,
  };
  const element = document.type === 'quote'
    ? await QuotePDF({ quote: document, organization, client: pdfClient })
    : await InvoicePDF({ invoice: document, organization, client: pdfClient });
  return renderToBuffer(element as React.ReactElement<DocumentProps>);
}

export function billingDocumentFilename(document: Pick<Invoice, 'type' | 'number'>): string {
  const label = document.type === 'quote' ? 'Devis' : 'Facture';
  return `${label}_${document.number.replace(/[^A-Za-z0-9_-]/g, '-')}.pdf`;
}
