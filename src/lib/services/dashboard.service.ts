import { db } from '../db/server';
import { clients, deals, tasks, invoices, requests } from '../db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

export type MonthlyRevenuePoint = { month: string; revenue: number };

/** Les `count` derniers mois (UTC), du plus ancien au courant : clé `AAAA-MM`
 * (comparable aux dates ISO stockées en texte) et libellé court français. */
export function monthlyRevenueWindow(count: number, now: Date) {
  const months: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }) });
  }
  return { months, since: `${months[0]?.key ?? now.toISOString().slice(0, 7)}-01` };
}

export function buildMonthlyRevenueSeries(
  months: readonly { key: string; label: string }[],
  rows: readonly { month: string; revenue: number }[],
): MonthlyRevenuePoint[] {
  const byMonth = new Map(rows.map((row) => [row.month, row.revenue]));
  return months.map(({ key, label }) => ({ month: label, revenue: byMonth.get(key) ?? 0 }));
}

export const dashboardService = {
  /** Les cinq indicateurs en une seule requête (sous-requêtes scalaires) : un
   * aller-retour au lieu de cinq. Les politiques RLS s'appliquent à chaque
   * sous-requête comme aux requêtes séparées d'avant. */
  async getProfessionalStats(organizationId: string) {
    const paidInvoice = and(eq(invoices.organizationId, organizationId), eq(invoices.status, 'paid'), eq(invoices.type, 'invoice'));
    const [row] = await db.select({
      clients: sql`(select count(*) from ${clients} where ${eq(clients.organizationId, organizationId)})`.mapWith(Number),
      activeDeals: sql`(select count(*) from ${deals} where ${and(eq(deals.organizationId, organizationId), eq(deals.status, 'won'))})`.mapWith(Number),
      pendingTasks: sql`(select count(*) from ${tasks} where ${and(eq(tasks.organizationId, organizationId), eq(tasks.status, 'pending'))})`.mapWith(Number),
      paidInvoices: sql`(select count(*) from ${invoices} where ${paidInvoice})`.mapWith(Number),
      totalRevenue: sql`(select coalesce(sum(${invoices.totalTTC}), 0) from ${invoices} where ${paidInvoice})`.mapWith(Number),
    }).from(sql`(select 1) as single_row`);
    return {
      clients: row?.clients || 0,
      activeDeals: row?.activeDeals || 0,
      pendingTasks: row?.pendingTasks || 0,
      paidInvoices: row?.paidInvoices || 0,
      totalRevenue: row?.totalRevenue || 0,
    };
  },

  /** Montant des affaires gagnées par mois (date de mise à jour, UTC) sur les
   * `months` derniers mois, calculé en SQL au lieu de charger toutes les affaires. */
  async getWonDealsRevenueByMonth(organizationId: string, months = 6, now: Date = new Date()) {
    const series = monthlyRevenueWindow(months, now);
    const month = sql<string>`substr(${deals.updatedAt}, 1, 7)`;
    const rows = await db.select({
      month,
      revenue: sql`coalesce(sum(${deals.value}), 0)`.mapWith(Number),
    }).from(deals).where(and(
      eq(deals.organizationId, organizationId),
      eq(deals.status, 'won'),
      gte(deals.updatedAt, series.since),
    )).groupBy(sql`1`);
    return buildMonthlyRevenueSeries(series.months, rows);
  },

  async getClientStats(userId: string) {
    const [requestsCount, quotesCount, invoicesCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(requests).where(eq(requests.clientId, userId)),
      db.select({ count: sql<number>`count(*)` }).from(invoices).where(and(sql`${invoices.clientId} = ${userId} OR ${invoices.recipientUserId} = ${userId}`, eq(invoices.type, 'quote'), sql`${invoices.status} IN ('sent', 'viewed')`)),
      db.select({ count: sql<number>`count(*)` }).from(invoices).where(and(sql`${invoices.clientId} = ${userId} OR ${invoices.recipientUserId} = ${userId}`, eq(invoices.type, 'invoice'), sql`${invoices.status} IN ('sent', 'viewed', 'overdue')`)),
    ]);
    return {
      activeRequests: requestsCount[0]?.count || 0,
      pendingQuotes: quotesCount[0]?.count || 0,
      unpaidInvoices: invoicesCount[0]?.count || 0,
    };
  },
};
