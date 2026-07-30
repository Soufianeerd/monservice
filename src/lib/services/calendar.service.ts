import { db } from '../db';
import { tasks, invoices, deals } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const calendarService = {
  async getEvents(organizationId: string, startDate: string, endDate: string) {
    // 1. Récupérer les tâches avec échéance
    const tasksEvents = await db.select({
      id: tasks.id,
      title: tasks.title,
      date: tasks.dueDate,
      type: sql<string>`'task'`,
      status: tasks.status,
    }).from(tasks).where(
      and(
        eq(tasks.organizationId, organizationId),
        sql`${tasks.dueDate} BETWEEN ${startDate} AND ${endDate}`
      )
    );

    // 2. Récupérer les factures avec échéance
    const invoicesEvents = await db.select({
      id: invoices.id,
      title: sql<string>`'Facture ' || ${invoices.number}`,
      date: invoices.dueDate,
      type: sql<string>`'invoice'`,
      status: invoices.status,
    }).from(invoices).where(
      and(
        eq(invoices.organizationId, organizationId),
        sql`${invoices.dueDate} BETWEEN ${startDate} AND ${endDate}`
      )
    );

    // 3. Récupérer les deals avec date de clôture prévue
    const dealsEvents = await db.select({
      id: deals.id,
      title: sql<string>`'Deal: ' || ${deals.name}`,
      date: deals.expectedCloseDate,
      type: sql<string>`'deal'`,
      status: deals.status,
    }).from(deals).where(
      and(
        eq(deals.organizationId, organizationId),
        sql`${deals.expectedCloseDate} BETWEEN ${startDate} AND ${endDate}`
      )
    );

    return [...tasksEvents, ...invoicesEvents, ...dealsEvents];
  },
};
