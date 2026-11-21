import 'server-only';
import { and, eq, gte, lt } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { clients, invoices } from '@/lib/db/schema';
import { computeTreasury, type TreasuryInvoiceRow, type TreasurySummary } from '@/lib/growth/treasury';

// Trésorerie et journal des ventes, à partir des factures de l'organisation
// (RLS : organisation courante uniquement).

const columns = {
  id: invoices.id,
  number: invoices.number,
  type: invoices.type,
  status: invoices.status,
  clientName: clients.name,
  title: invoices.title,
  date: invoices.date,
  dueDate: invoices.dueDate,
  paidAt: invoices.paidAt,
  totalHT: invoices.totalHT,
  taxAmount: invoices.taxAmount,
  totalTTC: invoices.totalTTC,
  amountDue: invoices.amountDue,
  prepaidAmount: invoices.prepaidAmount,
  paymentMethod: invoices.paymentMethod,
};

async function invoiceRows(organizationId: string, range?: { from: string; to: string }): Promise<TreasuryInvoiceRow[]> {
  const conditions = [eq(invoices.organizationId, organizationId), eq(invoices.type, 'invoice')];
  if (range) {
    // Dates stockées en texte ISO, parfois avec l'heure : borne haute exclusive au lendemain.
    const dayAfter = new Date(Date.parse(`${range.to}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    conditions.push(gte(invoices.date, range.from), lt(invoices.date, dayAfter));
  }
  return db
    .select(columns)
    .from(invoices)
    .leftJoin(clients, and(eq(clients.id, invoices.clientId), eq(clients.organizationId, invoices.organizationId)))
    .where(and(...conditions));
}

export async function getTreasury(organizationId: string): Promise<TreasurySummary> {
  return computeTreasury(await invoiceRows(organizationId));
}

export async function getSalesJournalRows(organizationId: string, from: string, to: string): Promise<TreasuryInvoiceRow[]> {
  return invoiceRows(organizationId, { from, to });
}
