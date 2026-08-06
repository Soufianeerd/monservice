import { NextResponse } from 'next/server';
import { reminderService } from '@/lib/services/reminder.service';
import { getSessionContext } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/api-response';

/**
 * Déclenche la vérification des relances.
 *
 * Deux modes d'appel, tous deux authentifiés :
 *  - une tâche planifiée, porteuse de l'en-tête `x-cron-secret` (toutes les
 *    organisations) ;
 *  - un utilisateur connecté, pour sa seule organisation.
 *
 * L'ancienne version acceptait un `organizationId` en query string sans
 * aucune authentification : elle permettait de déclencher des envois pour
 * n'importe quelle organisation et d'énumérer les identifiants existants
 * (anomalie MS-013).
 */
export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = req.headers.get('x-cron-secret');
    const isCron = Boolean(cronSecret) && providedSecret === cronSecret;

    if (isCron) {
      const result = await reminderService.checkAndSendRemindersForAllOrganizations();
      return NextResponse.json({ success: true, count: result.sent });
    }

    const ctx = await getSessionContext();
    if (!ctx?.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const result = await reminderService.checkAndSendReminders(ctx.organizationId);
    return NextResponse.json({ success: true, count: result?.sent ?? 0 });
  } catch (error) {
    return toErrorResponse(error, 'Erreur lors de la vérification des relances');
  }
}
