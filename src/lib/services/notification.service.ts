import 'server-only';
import { db } from '../db/server';
import { invoices, tasks, clients } from '../db/schema';
import { and, eq, lt, ne, sql } from 'drizzle-orm';

/**
 * Notifications — implémentation réelle.
 *
 * L'ancienne version était une coquille vide : toutes les méthodes
 * retournaient `0`, `[]` ou `undefined`, alors que `NotificationCenter`
 * affichait une cloche et un compteur dans l'interface (anomalie MS-018).
 *
 * Choix d'implémentation : les notifications sont **dérivées** de l'état des
 * données, et non stockées. Pas de table à maintenir, pas de désynchronisation
 * possible, et une facture réglée cesse immédiatement d'être signalée.
 *
 * Contrepartie assumée : l'état « lu » ne persiste pas entre les sessions. Une
 * table dédiée sera nécessaire lorsque le volume le justifiera.
 */

export type NotificationType = 'invoice_overdue' | 'invoice_due_soon' | 'task_overdue' | 'quote_pending';
export type NotificationSeverity = 'info' | 'warning' | 'urgent';

export type Notification = {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  url: string;
  date: string;
};

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export class NotificationService {
  /**
   * Notifications courantes d'une organisation, triées par urgence.
   */
  async findAll(organizationId: string): Promise<Notification[]> {
    if (!organizationId) return [];

    const now = new Date();
    const todayIso = now.toISOString();
    const inSevenDays = new Date(now.getTime() + 7 * 86_400_000).toISOString();

    const results: Notification[] = [];

    try {
      // --- Factures échues et non réglées -----------------------------------
      const overdue = await db
        .select({
          id: invoices.id,
          number: invoices.number,
          dueDate: invoices.dueDate,
          totalTTC: invoices.totalTTC,
          clientName: clients.name,
        })
        .from(invoices)
        .leftJoin(clients, eq(clients.id, invoices.clientId))
        .where(
          and(
            eq(invoices.organizationId, organizationId),
            eq(invoices.type, 'invoice'),
            ne(invoices.status, 'paid'),
            ne(invoices.status, 'cancelled'),
            ne(invoices.status, 'draft'),
            lt(invoices.dueDate, todayIso),
          ),
        )
        .limit(50);

      for (const inv of overdue) {
        const days = inv.dueDate ? daysBetween(new Date(inv.dueDate), now) : 0;
        results.push({
          id: `invoice_overdue:${inv.id}`,
          type: 'invoice_overdue',
          severity: days > 30 ? 'urgent' : 'warning',
          title: `Facture ${inv.number} en retard`,
          message: `${inv.clientName ?? 'Client'} — ${days} jour${days > 1 ? 's' : ''} de retard`,
          url: `/facturation/factures/${inv.id}`,
          date: inv.dueDate ?? todayIso,
        });
      }

      // --- Factures à échéance proche ---------------------------------------
      const dueSoon = await db
        .select({
          id: invoices.id,
          number: invoices.number,
          dueDate: invoices.dueDate,
          clientName: clients.name,
        })
        .from(invoices)
        .leftJoin(clients, eq(clients.id, invoices.clientId))
        .where(
          and(
            eq(invoices.organizationId, organizationId),
            eq(invoices.type, 'invoice'),
            ne(invoices.status, 'paid'),
            ne(invoices.status, 'cancelled'),
            ne(invoices.status, 'draft'),
            sql`${invoices.dueDate} >= ${todayIso}`,
            sql`${invoices.dueDate} <= ${inSevenDays}`,
          ),
        )
        .limit(50);

      for (const inv of dueSoon) {
        results.push({
          id: `invoice_due_soon:${inv.id}`,
          type: 'invoice_due_soon',
          severity: 'info',
          title: `Facture ${inv.number} à échéance`,
          message: `${inv.clientName ?? 'Client'} — échéance proche`,
          url: `/facturation/factures/${inv.id}`,
          date: inv.dueDate ?? todayIso,
        });
      }

      // --- Tâches en retard --------------------------------------------------
      const lateTasks = await db
        .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate })
        .from(tasks)
        .where(
          and(
            eq(tasks.organizationId, organizationId),
            ne(tasks.status, 'completed'),
            ne(tasks.status, 'cancelled'),
            lt(tasks.dueDate, todayIso),
          ),
        )
        .limit(50);

      for (const task of lateTasks) {
        results.push({
          id: `task_overdue:${task.id}`,
          type: 'task_overdue',
          severity: 'warning',
          title: 'Tâche en retard',
          message: task.title,
          url: `/agenda/taches/${task.id}`,
          date: task.dueDate ?? todayIso,
        });
      }
    } catch (err) {
      // Les notifications sont un confort : leur échec ne doit jamais casser
      // l'affichage du tableau de bord.
      console.error('[notifications] échec de la génération', err);
      return [];
    }

    const severityRank: Record<NotificationSeverity, number> = { urgent: 0, warning: 1, info: 2 };
    return results.sort(
      (a, b) =>
        severityRank[a.severity] - severityRank[b.severity] || a.date.localeCompare(b.date),
    );
  }

  /** @deprecated Les notifications sont dérivées, plus rien à générer. */
  async generateNotifications(organizationId: string): Promise<Notification[]> {
    return this.findAll(organizationId);
  }

  async getUnreadCount(organizationId: string, _userId?: string): Promise<number> {
    const all = await this.findAll(organizationId);
    return all.filter((n) => n.severity !== 'info').length;
  }

  /**
   * Sans table de persistance, l'état « lu » ne survit pas à la session.
   * Conservé pour compatibilité d'interface.
   */
  async markAsRead(_notificationId: string): Promise<void> {}
  async markAllAsRead(_organizationId: string, _userId?: string): Promise<void> {}
}

export const notificationService = new NotificationService();
