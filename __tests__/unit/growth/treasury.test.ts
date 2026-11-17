import { describe, expect, it } from 'vitest';
import { buildSalesJournalCsv, collectedAmount, computeTreasury, openAmount, type TreasuryInvoiceRow } from '@/lib/growth/treasury';

const NOW = new Date('2026-11-17T10:00:00Z');

function row(overrides: Partial<TreasuryInvoiceRow>): TreasuryInvoiceRow {
  return {
    id: 'i', number: 'F-1', type: 'invoice', status: 'sent', clientName: 'Dupont', title: null,
    date: '2026-11-01', dueDate: '2026-12-01', paidAt: null,
    totalHT: 100, taxAmount: 20, totalTTC: 120, amountDue: 120, prepaidAmount: 0, paymentMethod: null,
    ...overrides,
  };
}

describe('trésorerie', () => {
  it('sépare encaissé, à encaisser et en retard', () => {
    const t = computeTreasury([
      row({ id: 'paid-month', status: 'paid', paidAt: '2026-11-05T12:00:00Z', amountDue: 0 }),
      row({ id: 'paid-year', status: 'paid', paidAt: '2026-02-05T12:00:00Z', amountDue: 0, totalTTC: 300 }),
      row({ id: 'paid-last-year', status: 'paid', paidAt: '2025-12-20T12:00:00Z', amountDue: 0, totalTTC: 999 }),
      row({ id: 'open', dueDate: '2026-12-01' }),
      row({ id: 'late-10', dueDate: '2026-11-07', clientName: 'Martin', amountDue: 50 }),
      row({ id: 'late-100', dueDate: '2026-08-09', clientName: 'martin ', amountDue: 70 }),
      row({ id: 'draft', status: 'draft' }),
      row({ id: 'cancelled', status: 'cancelled' }),
      row({ id: 'quote', type: 'quote' }),
    ], NOW);
    expect(t.collectedThisMonth).toBe(120);
    expect(t.collectedThisYear).toBe(420);
    expect(t.outstanding).toBe(240);
    expect(t.outstandingCount).toBe(3);
    expect(t.overdue).toBe(120);
    expect(t.overdueCount).toBe(2);
    expect(t.dueNext30Days).toBe(120);
    expect(t.aging.map((b) => b.amount)).toEqual([120, 50, 0, 0, 70]);
    expect(t.debtors).toEqual([{ clientName: 'Martin', amount: 120, oldestDaysLate: 100, count: 2 }]);
    expect(t.overdueInvoices.map((i) => i.id)).toEqual(['late-100', 'late-10']);
  });

  it('couvre douze mois glissants, facturé et encaissé', () => {
    const t = computeTreasury([
      row({ status: 'paid', date: '2026-10-10', paidAt: '2026-11-02', amountDue: 0 }),
      row({ date: '2025-01-10' }),
    ], NOW);
    expect(t.monthly).toHaveLength(12);
    expect(t.monthly[0].month).toBe('2025-12');
    expect(t.monthly[11]).toEqual({ month: '2026-11', collected: 120, invoiced: 0 });
    expect(t.monthly[10]).toEqual({ month: '2026-10', collected: 0, invoiced: 120 });
  });

  it('déduit les acomptes déjà facturés', () => {
    expect(openAmount({ amountDue: 0, totalTTC: 1000, prepaidAmount: 300 })).toBe(700);
    expect(openAmount({ amountDue: 0, totalTTC: 1000, prepaidAmount: 1000 })).toBe(0);
    expect(openAmount({ amountDue: 250.555, totalTTC: 1000, prepaidAmount: 0 })).toBe(250.56);
    expect(collectedAmount({ totalTTC: 1000, prepaidAmount: 300 })).toBe(700);
  });

  it('ignore une date de règlement absente ou illisible', () => {
    const t = computeTreasury([row({ status: 'paid', paidAt: null }), row({ status: 'paid', paidAt: 'n/a' })], NOW);
    expect(t.collectedThisYear).toBe(0);
  });
});

describe('journal des ventes', () => {
  it('produit un CSV français trié, sans brouillon ni devis', () => {
    const csv = buildSalesJournalCsv([
      row({ number: 'F-2', date: '2026-11-03', status: 'paid', paidAt: '2026-11-04T12:00:00Z', paymentMethod: 'transfer', totalHT: 1000.5, taxAmount: 200.1, totalTTC: 1200.6 }),
      row({ number: 'F-1', date: '2026-11-02', clientName: 'Durand; et fils', title: 'Pose "chaudière"' }),
      row({ number: 'B-1', status: 'draft' }),
      row({ number: 'D-1', type: 'quote' }),
    ]);
    expect(csv.startsWith('\uFEFFDate;Numéro;Client;Objet;Montant HT;TVA;Montant TTC;Statut;Réglée le;Mode de règlement\r\n')).toBe(true);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('2026-11-02;F-1;"Durand; et fils";"Pose ""chaudière""";100,00;20,00;120,00;Envoyée;;');
    expect(lines[2]).toBe('2026-11-03;F-2;Dupont;;1000,50;200,10;1200,60;Payée;2026-11-04;Virement');
  });

  it('neutralise les formules de tableur', () => {
    const csv = buildSalesJournalCsv([row({ clientName: '=HYPERLINK("http://x")', title: '+1', number: '@SUM' })]);
    const line = csv.trim().split('\r\n')[1];
    expect(line).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(line).toContain(";'+1;");
    expect(line).toContain(";'@SUM;");
  });
});
