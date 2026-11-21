import { isOpenInvoiceStatus, PAYMENT_METHOD_LABELS } from './payment';
import type { InvoicePaymentMethod } from '@/lib/db/schema';

// Trésorerie d'une organisation, calculée à partir de ses factures. Fonctions
// pures : le service lit les lignes, ce module les agrège.

export type TreasuryInvoiceRow = {
  id: string;
  number: string;
  type: string;
  status: string;
  clientName: string | null;
  title?: string | null;
  date: string;
  dueDate: string | null;
  paidAt: string | null;
  totalHT: number;
  taxAmount: number;
  totalTTC: number;
  amountDue: number;
  prepaidAmount: number;
  paymentMethod?: InvoicePaymentMethod | null;
};

export type AgingBucket = { label: string; amount: number; count: number };

export type TreasurySummary = {
  collectedThisMonth: number;
  collectedThisYear: number;
  outstanding: number;
  outstandingCount: number;
  overdue: number;
  overdueCount: number;
  dueNext30Days: number;
  aging: AgingBucket[];
  monthly: Array<{ month: string; collected: number; invoiced: number }>;
  debtors: Array<{ clientName: string; amount: number; oldestDaysLate: number; count: number }>;
  overdueInvoices: Array<{ id: string; number: string; clientName: string; amount: number; dueDate: string; daysLate: number }>;
};

const round = (value: number) => Math.round(value * 100) / 100;

function isoDay(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  return value.slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

/** Reste à encaisser d'une facture ouverte. */
export function openAmount(row: Pick<TreasuryInvoiceRow, 'amountDue' | 'totalTTC' | 'prepaidAmount'>): number {
  if (row.amountDue > 0) return round(row.amountDue);
  return round(Math.max(0, row.totalTTC - row.prepaidAmount));
}

/** Montant encaissé pour une facture réglée (hors acomptes déjà facturés). */
export function collectedAmount(row: Pick<TreasuryInvoiceRow, 'totalTTC' | 'prepaidAmount'>): number {
  return round(Math.max(0, row.totalTTC - row.prepaidAmount));
}

export function computeTreasury(rows: TreasuryInvoiceRow[], now: Date = new Date()): TreasurySummary {
  const today = now.toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  const in30 = new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);

  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const monthly = new Map(months.map((m) => [m, { month: m, collected: 0, invoiced: 0 }]));

  const aging: AgingBucket[] = [
    { label: 'Non échu', amount: 0, count: 0 },
    { label: '1 à 30 jours', amount: 0, count: 0 },
    { label: '31 à 60 jours', amount: 0, count: 0 },
    { label: '61 à 90 jours', amount: 0, count: 0 },
    { label: 'Plus de 90 jours', amount: 0, count: 0 },
  ];
  const debtors = new Map<string, { clientName: string; amount: number; oldestDaysLate: number; count: number }>();
  const overdueInvoices: TreasurySummary['overdueInvoices'] = [];

  let collectedThisMonth = 0;
  let collectedThisYear = 0;
  let outstanding = 0;
  let outstandingCount = 0;
  let overdue = 0;
  let overdueCount = 0;
  let dueNext30Days = 0;

  for (const row of rows) {
    if (row.type !== 'invoice') continue;
    const issued = isoDay(row.date);
    if (issued && row.status !== 'draft' && row.status !== 'cancelled' && row.status !== 'superseded') {
      const bucket = monthly.get(issued.slice(0, 7));
      if (bucket) bucket.invoiced = round(bucket.invoiced + row.totalTTC);
    }

    if (row.status === 'paid') {
      const paid = isoDay(row.paidAt);
      if (!paid) continue;
      const amount = collectedAmount(row);
      if (paid.slice(0, 7) === month) collectedThisMonth += amount;
      if (paid.slice(0, 4) === year) collectedThisYear += amount;
      const bucket = monthly.get(paid.slice(0, 7));
      if (bucket) bucket.collected = round(bucket.collected + amount);
      continue;
    }

    if (!isOpenInvoiceStatus(row.status)) continue;
    const amount = openAmount(row);
    if (amount <= 0) continue;
    outstanding += amount;
    outstandingCount++;

    const due = isoDay(row.dueDate);
    const daysLate = due ? daysBetween(due, today) : 0;
    const bucketIndex = !due || daysLate <= 0 ? 0 : daysLate <= 30 ? 1 : daysLate <= 60 ? 2 : daysLate <= 90 ? 3 : 4;
    aging[bucketIndex].amount += amount;
    aging[bucketIndex].count++;

    if (due && due >= today && due <= in30) dueNext30Days += amount;

    if (due && daysLate > 0) {
      overdue += amount;
      overdueCount++;
      const clientName = row.clientName?.trim() || 'Client sans nom';
      overdueInvoices.push({ id: row.id, number: row.number, clientName, amount, dueDate: due, daysLate });
      const key = clientName.toLocaleLowerCase('fr');
      const debtor = debtors.get(key) ?? { clientName, amount: 0, oldestDaysLate: 0, count: 0 };
      debtor.amount += amount;
      debtor.count++;
      debtor.oldestDaysLate = Math.max(debtor.oldestDaysLate, daysLate);
      debtors.set(key, debtor);
    }
  }

  return {
    collectedThisMonth: round(collectedThisMonth),
    collectedThisYear: round(collectedThisYear),
    outstanding: round(outstanding),
    outstandingCount,
    overdue: round(overdue),
    overdueCount,
    dueNext30Days: round(dueNext30Days),
    aging: aging.map((bucket) => ({ ...bucket, amount: round(bucket.amount) })),
    monthly: [...monthly.values()],
    debtors: [...debtors.values()]
      .map((debtor) => ({ ...debtor, amount: round(debtor.amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10),
    overdueInvoices: overdueInvoices.sort((a, b) => b.daysLate - a.daysLate),
  };
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  viewed: 'Consultée',
  overdue: 'En retard',
  pending: 'En attente',
  unpaid: 'Impayée',
  partially_paid: 'Partiellement payée',
  paid: 'Payée',
  cancelled: 'Annulée',
  superseded: 'Remplacée',
};

/** Neutralise les cellules qu'un tableur interpréterait comme formule. */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function csvAmount(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/**
 * Journal des ventes au format attendu par les experts-comptables français :
 * séparateur point-virgule, virgule décimale, UTF-8 avec BOM pour Excel.
 */
export function buildSalesJournalCsv(rows: TreasuryInvoiceRow[]): string {
  const header = ['Date', 'Numéro', 'Client', 'Objet', 'Montant HT', 'TVA', 'Montant TTC', 'Statut', 'Réglée le', 'Mode de règlement'];
  const lines = rows
    .filter((row) => row.type === 'invoice' && row.status !== 'draft')
    .sort((a, b) => (a.date === b.date ? a.number.localeCompare(b.number) : a.date.localeCompare(b.date)))
    .map((row) => [
      isoDay(row.date) ?? row.date,
      row.number,
      row.clientName ?? '',
      row.title ?? '',
      csvAmount(row.totalHT),
      csvAmount(row.taxAmount),
      csvAmount(row.totalTTC),
      STATUS_LABELS[row.status] ?? row.status,
      row.status === 'paid' ? isoDay(row.paidAt) ?? '' : '',
      row.paymentMethod ? PAYMENT_METHOD_LABELS[row.paymentMethod] : '',
    ].map((cell) => csvCell(String(cell))).join(';'));
  return `\uFEFF${[header.join(';'), ...lines].join('\r\n')}\r\n`;
}
