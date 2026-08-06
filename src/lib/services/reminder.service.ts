import 'server-only';
import { db } from '../db/server';
import { invoices, clients, organizations } from '../db/schema';
import { and, eq, lt, ne, isNotNull } from 'drizzle-orm';
import { sendEmail, isEmailConfigured } from '../email';
import { invoiceReminderTemplate } from '../email/templates';

/**
 * Relances automatiques des factures impayées.
 *
 * L'ancienne version était une classe vide renvoyant `{ sent: 0, errors: 0 }`,
 * alors que l'écran « Relances » était présent dans l'interface
 * (anomalie MS-018).
 *
 * Règles appliquées :
 *  - relance à J+7, J+15 et J+30 après l'échéance, jamais plus de trois fois ;
 *  - jamais avant l'échéance, jamais sur un brouillon, une facture annulée ou
 *    déjà réglée ;
 *  - un plafond par exécution évite qu'une base mal configurée ne déclenche
 *    des centaines d'envois — et n'abîme la réputation du domaine.
 */

/** Jours de retard déclenchant une relance. */
const REMINDER_DAYS = [7, 15, 30] as const;

/** Plafond d'envois par exécution et par organisation. */
const MAX_REMINDERS_PER_RUN = 50;

/** Tolérance : la tâche planifiée ne tourne pas à la seconde près. */
const DAY_TOLERANCE = 1;

export type ReminderResult = { sent: number; errors: number; skipped: number };

function daysOverdue(dueDate: string, now: Date): number {
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return -1;
  return Math.floor((now.getTime() - due.getTime()) / 86_400_000);
}

/** Une relance est-elle due aujourd'hui pour ce niveau de retard ? */
function shouldRemindToday(days: number): boolean {
  return REMINDER_DAYS.some((d) => Math.abs(days - d) <= DAY_TOLERANCE);
}

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}${path}`;
}

export class ReminderService {
  /** Relances pour une organisation. */
  async checkAndSendReminders(organizationId: string): Promise<ReminderResult> {
    const result: ReminderResult = { sent: 0, errors: 0, skipped: 0 };

    if (!organizationId) return result;

    if (!isEmailConfigured()) {
      console.warn('[reminder] e-mail non configuré — aucune relance envoyée', {
        organizationId,
      });
      return result;
    }

    const now = new Date();
    const todayIso = now.toISOString();

    try {
      const organization = await db
        .select({ name: organizations.name, email: organizations.email })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      const overdue = await db
        .select({
          id: invoices.id,
          number: invoices.number,
          dueDate: invoices.dueDate,
          totalTTC: invoices.totalTTC,
          clientName: clients.name,
          clientEmail: clients.email,
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
            isNotNull(invoices.dueDate),
            lt(invoices.dueDate, todayIso),
          ),
        )
        .limit(MAX_REMINDERS_PER_RUN * 3);

      for (const invoice of overdue) {
        if (result.sent >= MAX_REMINDERS_PER_RUN) {
          console.warn('[reminder] plafond par exécution atteint', { organizationId });
          break;
        }

        if (!invoice.dueDate) continue;

        const days = daysOverdue(invoice.dueDate, now);
        if (!shouldRemindToday(days)) {
          result.skipped++;
          continue;
        }

        if (!invoice.clientEmail) {
          result.skipped++;
          continue;
        }

        const template = invoiceReminderTemplate({
          clientName: invoice.clientName ?? 'Madame, Monsieur',
          organizationName: organization[0]?.name ?? 'Votre prestataire',
          invoiceNumber: invoice.number,
          totalTTC: invoice.totalTTC,
          dueDate: invoice.dueDate,
          daysOverdue: days,
          url: appUrl(`/client/invoices/${invoice.id}`),
        });

        const sendResult = await sendEmail({
          to: invoice.clientEmail,
          subject: template.subject,
          html: template.html,
          replyTo: organization[0]?.email ?? undefined,
          tag: 'invoice.reminder',
        });

        if (sendResult.sent) {
          result.sent++;
          console.info('[audit] invoice.reminder.sent', {
            invoiceId: invoice.id,
            organizationId,
            daysOverdue: days,
            at: todayIso,
          });
        } else {
          result.errors++;
        }
      }
    } catch (err) {
      console.error('[reminder] échec du traitement', { organizationId, error: err });
      result.errors++;
    }

    return result;
  }

  /** Relances pour toutes les organisations — appelé par la tâche planifiée. */
  async checkAndSendRemindersForAllOrganizations(): Promise<ReminderResult> {
    const total: ReminderResult = { sent: 0, errors: 0, skipped: 0 };

    if (!isEmailConfigured()) {
      console.warn('[reminder] e-mail non configuré — exécution planifiée sans effet');
      return total;
    }

    const allOrganizations = await db.select({ id: organizations.id }).from(organizations);

    for (const org of allOrganizations) {
      const result = await this.checkAndSendReminders(org.id);
      total.sent += result.sent;
      total.errors += result.errors;
      total.skipped += result.skipped;
    }

    console.info('[audit] reminders.cron.completed', { ...total, at: new Date().toISOString() });

    return total;
  }
}

export const reminderService = new ReminderService();
