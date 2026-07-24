import { DealStatus } from '../data/interfaces/deal.interface';
import { InvoiceStatus, Invoice } from '../data/interfaces/invoice.interface';

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  prospect: 'Prospect',
  qualification: 'Qualification',
  negotiation: 'Négociation',
  proposal: 'Proposition',
  won: 'Gagné',
  lost: 'Perdu',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  viewed: 'Consultée',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

export const INVOICE_TYPE_LABELS: Record<Invoice['type'], string> = {
  invoice: 'Facture',
  quote: 'Devis',
};
