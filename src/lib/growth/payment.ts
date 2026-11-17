import type { InvoicePaymentMethod } from '@/lib/db/schema';

// Règlement saisi par le professionnel (virement, chèque…) : sans lui, une
// facture ne pouvait passer « payée » que par le webhook Stripe, désactivé au
// lancement. Trésorerie, relances et avis en dépendent.

export const MANUAL_PAYMENT_METHODS = ['transfer', 'check', 'cash', 'card', 'direct_debit', 'other'] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<InvoicePaymentMethod, string> = {
  transfer: 'Virement',
  check: 'Chèque',
  cash: 'Espèces',
  card: 'Carte bancaire',
  direct_debit: 'Prélèvement',
  other: 'Autre',
  stripe: 'Paiement en ligne',
};

/** Statuts d'une facture émise et non soldée. */
export const OPEN_INVOICE_STATUSES = ['sent', 'viewed', 'overdue', 'pending', 'unpaid', 'partially_paid'] as const;

export function isOpenInvoiceStatus(status: string): boolean {
  return (OPEN_INVOICE_STATUSES as readonly string[]).includes(status);
}

/** Date de règlement acceptable : ni avant l'émission, ni dans le futur. */
export function validatePaymentDate(paidOn: string, invoiceDate: string, today: Date = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || Number.isNaN(Date.parse(`${paidOn}T00:00:00Z`))) {
    return 'Date de règlement invalide.';
  }
  const todayIso = today.toISOString().slice(0, 10);
  if (paidOn > todayIso) return 'La date de règlement ne peut pas être dans le futur.';
  const issued = invoiceDate.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(issued) && paidOn < issued) {
    return 'La date de règlement ne peut pas précéder la date de la facture.';
  }
  return null;
}
