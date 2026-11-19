import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '../db/server';
import { sendEmail, isEmailConfigured } from '../email';
import { invoiceReminderTemplate, quoteFollowupTemplate, reviewRequestTemplate } from '../email/templates';
import { buildReviewUrl, generateReviewToken, hashReviewToken } from '../growth/review';

/**
 * Automatisations quotidiennes : relances de factures échues, relance des devis
 * sans réponse, demandes d'avis après règlement (migration 0020).
 *
 * Exécuté uniquement par la tâche planifiée, sous le rôle restreint
 * `monservice_reminders` : la sélection (réglages de chaque organisation,
 * seuils, exclusions) est faite en SQL par due_automation_items(), et chaque
 * envoi est réservé avant de partir (claim_automation_delivery) — deux
 * exécutions concurrentes ou répétées n'envoient jamais deux fois la même
 * relance. L'ancienne version relançait trois jours de suite autour de chaque
 * seuil et pointait vers l'espace client, fermé en V1.
 */

/** Plafond d'envois par exécution : protège la réputation du domaine. */
const MAX_ITEMS_PER_RUN = 200;

export type ReminderResult = { sent: number; errors: number; skipped: number };

type DueItem = {
  kind: 'invoice_overdue' | 'quote_followup' | 'review_request';
  level: number;
  organizationName: string;
  organizationEmail: string | null;
  paymentDetails: string | null;
  documentId: string;
  documentNumber: string;
  clientName: string | null;
  clientEmail: string;
  totalTTC: number;
  amountDue: number;
  referenceDate: string;
  daysLate: number;
};

function appBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  return configured && URL.canParse(configured) ? configured : 'http://localhost:3000';
}

function asDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === 'string' ? value.slice(0, 10) : '';
}

function toDueItem(row: Record<string, unknown>): DueItem | null {
  const kind = row.kind;
  if (kind !== 'invoice_overdue' && kind !== 'quote_followup' && kind !== 'review_request') return null;
  if (typeof row.client_email !== 'string' || !row.client_email) return null;
  return {
    kind,
    level: Number(row.level),
    organizationName: String(row.organization_name ?? ''),
    organizationEmail: typeof row.organization_email === 'string' && row.organization_email ? row.organization_email : null,
    paymentDetails: typeof row.payment_details === 'string' ? row.payment_details : null,
    documentId: String(row.document_id),
    documentNumber: String(row.document_number),
    clientName: typeof row.client_name === 'string' ? row.client_name : null,
    clientEmail: row.client_email,
    totalTTC: Number(row.total_ttc ?? 0),
    amountDue: Number(row.amount_due ?? 0),
    referenceDate: asDateString(row.reference_date),
    daysLate: Number(row.days_late ?? 0),
  };
}

function compose(item: DueItem, reviewUrl: string | null) {
  const clientName = item.clientName?.trim() || 'Madame, Monsieur';
  const organizationName = item.organizationName || 'Votre prestataire';
  if (item.kind === 'invoice_overdue') {
    return invoiceReminderTemplate({
      clientName,
      organizationName,
      invoiceNumber: item.documentNumber,
      amount: item.amountDue > 0 ? item.amountDue : item.totalTTC,
      dueDate: item.referenceDate,
      daysOverdue: item.daysLate,
      level: item.level === 3 ? 3 : item.level === 2 ? 2 : 1,
      paymentDetails: item.paymentDetails,
    });
  }
  if (item.kind === 'quote_followup') {
    return quoteFollowupTemplate({
      clientName,
      organizationName,
      quoteNumber: item.documentNumber,
      amount: item.totalTTC,
      sentOn: item.referenceDate,
    });
  }
  return reviewRequestTemplate({ clientName, organizationName, url: reviewUrl ?? appBaseUrl() });
}

export class ReminderService {
  /** Toutes les organisations ayant activé une automatisation. */
  async checkAndSendRemindersForAllOrganizations(): Promise<ReminderResult> {
    const result: ReminderResult = { sent: 0, errors: 0, skipped: 0 };
    if (!isEmailConfigured()) {
      console.warn('[automation] e-mail non configuré — exécution planifiée sans effet');
      return result;
    }

    const rows = await db.execute(sql`select * from public.due_automation_items(${MAX_ITEMS_PER_RUN})`);
    for (const row of rows) {
      const item = toDueItem(row);
      if (!item) {
        result.skipped++;
        continue;
      }
      const claimed = await db.execute(
        sql`select public.claim_automation_delivery(${item.documentId}, ${item.kind}, ${item.level}) as id`,
      );
      const deliveryId = claimed[0]?.id;
      if (typeof deliveryId !== 'string') {
        result.skipped++;
        continue;
      }

      let status: 'sent' | 'failed' | 'skipped' = 'failed';
      try {
        let reviewUrl: string | null = null;
        if (item.kind === 'review_request') {
          const token = generateReviewToken();
          await db.execute(sql`select public.issue_automatic_review_request(${item.documentId}, ${hashReviewToken(token)})`);
          reviewUrl = buildReviewUrl(appBaseUrl(), token);
        }
        const template = compose(item, reviewUrl);
        const sent = await sendEmail({
          to: item.clientEmail,
          subject: template.subject,
          html: template.html,
          replyTo: item.organizationEmail ?? undefined,
          tag: `automation.${item.kind}`,
          onBehalfOf: item.organizationName,
        });
        status = sent.sent ? 'sent' : 'failed';
      } catch (err) {
        console.error('[automation] échec d’un envoi', { documentId: item.documentId, kind: item.kind, error: err });
        status = 'failed';
      }

      await db.execute(sql`select public.complete_automation_delivery(${deliveryId}, ${status})`);
      if (status === 'sent') result.sent++;
      else result.errors++;
    }

    console.info('[audit] automations.cron.completed', { ...result, at: new Date().toISOString() });
    return result;
  }
}

export const reminderService = new ReminderService();
