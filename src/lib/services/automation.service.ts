import 'server-only';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { automationDeliveries, invoices, organizationAutomationSettings } from '@/lib/db/schema';
import { AppError } from '@/lib/errors';
import { translatePostgresError } from '@/lib/utils/postgres-error';

// Réglages des automatisations (migration 0020). Lecture par les membres,
// écriture uniquement par save_automation_settings (administrateur).

export type AutomationSettings = {
  invoiceRemindersEnabled: boolean;
  quoteFollowupsEnabled: boolean;
  quoteFollowupDays: number;
  reviewRequestsEnabled: boolean;
  reviewRequestDelayDays: number;
};

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  invoiceRemindersEnabled: false,
  quoteFollowupsEnabled: false,
  quoteFollowupDays: 7,
  reviewRequestsEnabled: false,
  reviewRequestDelayDays: 3,
};

export type AutomationDelivery = {
  id: string;
  kind: 'invoice_overdue' | 'quote_followup' | 'review_request';
  level: number;
  status: string;
  documentNumber: string | null;
  claimedAt: string;
};

const KNOWN_ERRORS: Array<[string, AppError]> = [
  ['Organization admin required', new AppError('Seul un administrateur de l’organisation peut modifier ces réglages.', 403, 'TEAM_ADMIN_REQUIRED')],
  ['Automation unavailable for this sector', new AppError('Les relances automatiques ne sont pas disponibles pour ce secteur.', 403, 'SECTOR_UNAVAILABLE')],
];

export async function getAutomationSettings(organizationId: string): Promise<AutomationSettings> {
  const [row] = await db
    .select()
    .from(organizationAutomationSettings)
    .where(eq(organizationAutomationSettings.organizationId, organizationId))
    .limit(1);
  if (!row) return DEFAULT_AUTOMATION_SETTINGS;
  return {
    invoiceRemindersEnabled: row.invoiceRemindersEnabled,
    quoteFollowupsEnabled: row.quoteFollowupsEnabled,
    quoteFollowupDays: row.quoteFollowupDays,
    reviewRequestsEnabled: row.reviewRequestsEnabled,
    reviewRequestDelayDays: row.reviewRequestDelayDays,
  };
}

export async function saveAutomationSettings(settings: AutomationSettings): Promise<void> {
  try {
    await db.execute(sql`select public.save_automation_settings(
      ${settings.invoiceRemindersEnabled}, ${settings.quoteFollowupsEnabled}, ${settings.quoteFollowupDays},
      ${settings.reviewRequestsEnabled}, ${settings.reviewRequestDelayDays})`);
  } catch (err) {
    translatePostgresError(err, KNOWN_ERRORS);
  }
}

export async function listRecentDeliveries(organizationId: string, limit = 50): Promise<AutomationDelivery[]> {
  const rows = await db
    .select({
      id: automationDeliveries.id,
      kind: automationDeliveries.kind,
      level: automationDeliveries.level,
      status: automationDeliveries.status,
      documentNumber: invoices.number,
      claimedAt: automationDeliveries.claimedAt,
    })
    .from(automationDeliveries)
    .leftJoin(invoices, eq(invoices.id, automationDeliveries.documentId))
    .where(eq(automationDeliveries.organizationId, organizationId))
    .orderBy(desc(automationDeliveries.claimedAt))
    .limit(limit);
  return rows.flatMap((row) => {
    if (row.kind !== 'invoice_overdue' && row.kind !== 'quote_followup' && row.kind !== 'review_request') return [];
    return [{ ...row, kind: row.kind, claimedAt: row.claimedAt.toISOString() }];
  });
}
