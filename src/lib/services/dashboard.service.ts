import { db } from '../db/server';
import { clients, deals, tasks, invoices, requests } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const dashboardService = {
  async getProfessionalStats(organizationId: string) {
    const [
      clientsCount,
      activeDealsCount,
      tasksCount,
      invoicesCount,
      totalRevenue,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(clients).where(eq(clients.organizationId, organizationId)),
      db.select({ count: sql<number>`count(*)` }).from(deals).where(
        and(eq(deals.organizationId, organizationId), eq(deals.status, 'won'))
      ),
      db.select({ count: sql<number>`count(*)` }).from(tasks).where(
        and(eq(tasks.organizationId, organizationId), eq(tasks.status, 'pending'))
      ),
      db.select({ count: sql<number>`count(*)` }).from(invoices).where(
        and(eq(invoices.organizationId, organizationId), eq(invoices.status, 'paid'), eq(invoices.type, 'invoice'))
      ),
      db.select({ total: sql<number>`sum(total_ttc)` }).from(invoices).where(
        and(eq(invoices.organizationId, organizationId), eq(invoices.status, 'paid'), eq(invoices.type, 'invoice'))
      ),
    ]);
    return {
      clients: clientsCount[0]?.count || 0,
      activeDeals: activeDealsCount[0]?.count || 0,
      pendingTasks: tasksCount[0]?.count || 0,
      paidInvoices: invoicesCount[0]?.count || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
    };
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
