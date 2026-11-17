import { withWorkerDatabase } from '@/lib/db/worker-context';
import { NextResponse } from 'next/server';
import { reminderService } from '@/lib/services/reminder.service';
import { getSessionContext } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/api-response';
import { isValidCronSecret } from '@/lib/utils/cron-secret';

/**
 * Automatisations quotidiennes (relances, demandes d'avis).
 *
 * Réservé à la tâche planifiée, porteuse de l'en-tête `x-cron-secret`. Un
 * professionnel connecté ne déclenche plus d'envoi à la demande : les règles
 * activées dans Paramètres › Relances et avis s'appliquent chaque matin, et
 * un même rappel ne part jamais deux fois.
 *
 * L'ancienne version acceptait un `organizationId` en query string sans
 * aucune authentification (anomalie MS-013).
 */
export async function GET(req: Request) {
  try {
    if (isValidCronSecret(req.headers.get('x-cron-secret'), process.env.CRON_SECRET)) {
      const result = await withWorkerDatabase({ kind: 'reminders' }, () => reminderService.checkAndSendRemindersForAllOrganizations());
      return NextResponse.json({ success: true, count: result.sent, errors: result.errors, skipped: result.skipped });
    }

    const ctx = await getSessionContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Les relances partent automatiquement chaque matin selon vos réglages.' },
      { status: 403 },
    );
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors du traitement des relances');
  }
}
