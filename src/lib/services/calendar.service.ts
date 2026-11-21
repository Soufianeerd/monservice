import { db } from '../db/server';
import { tasks, invoices, deals } from '../db/schema';
import { eq, and, between, sql } from 'drizzle-orm';

export type CalendarEventType = 'task' | 'invoice' | 'deal';

const COLORS: Record<CalendarEventType, { backgroundColor: string; borderColor: string }> = {
  task: { backgroundColor: '#4f46e5', borderColor: '#4338ca' },
  invoice: { backgroundColor: '#dc2626', borderColor: '#b91c1c' },
  deal: { backgroundColor: '#059669', borderColor: '#047857' },
};

/** Fenêtre chargée par défaut : de trois mois avant à douze mois après le mois courant
 * (UTC). Le calendrier charge le reste à la demande quand on navigue au-delà. */
export function defaultCalendarWindow(now: Date = new Date()): { start: string; end: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 13, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export const calendarService = {
  /** Tâches, factures et affaires de la période en une seule requête (UNION ALL)
   * au lieu de trois allers-retours successifs. */
  async getEvents(organizationId: string, startDate: string, endDate: string) {
    const rows = await db.select({
      id: tasks.id,
      title: sql<string>`${tasks.title}`,
      date: sql<string | null>`${tasks.dueDate}`,
      type: sql<CalendarEventType>`'task'`,
      status: sql<string | null>`${tasks.status}`,
    }).from(tasks).where(
      and(eq(tasks.organizationId, organizationId), between(tasks.dueDate, startDate, endDate)),
    ).unionAll(
      db.select({
        id: invoices.id,
        title: sql<string>`'Facture ' || ${invoices.number}`,
        date: sql<string | null>`${invoices.dueDate}`,
        type: sql<CalendarEventType>`'invoice'`,
        status: sql<string | null>`${invoices.status}`,
      }).from(invoices).where(
        and(eq(invoices.organizationId, organizationId), between(invoices.dueDate, startDate, endDate)),
      ),
    ).unionAll(
      db.select({
        id: deals.id,
        title: sql<string>`'Deal: ' || ${deals.name}`,
        date: sql<string | null>`${deals.expectedCloseDate}`,
        type: sql<CalendarEventType>`'deal'`,
        status: sql<string | null>`${deals.status}`,
      }).from(deals).where(
        and(eq(deals.organizationId, organizationId), between(deals.expectedCloseDate, startDate, endDate)),
      ),
    );

    return rows.map((evt) => ({
      id: `${evt.type}_${evt.id}`,
      title: evt.title,
      start: evt.date,
      allDay: true,
      ...(COLORS[evt.type] ?? COLORS.task),
      extendedProps: {
        type: evt.type,
        status: evt.status,
        originalId: evt.id,
      },
    }));
  },
};
