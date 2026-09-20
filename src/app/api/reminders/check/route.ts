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
 *  - un professionnel connecté, pour sa seule organisation.
 *
 * L'ancienne version acceptait un `organizationId` en query string sans
 * aucune authentification (anomalie MS-013).
 */
export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = req.headers.get('x-cron-secret');
    const isCron = Boolean(cronSecret && cronSecret.length > 0) && providedSecret === cronSecret;

    if (isCron) {
      const result = await reminderService.checkAndSendRemindersForAllOrganizations();
      return NextResponse.json({ success: true, count: result.sent });
    }

    const ctx = await getSessionContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    if (ctx.profileType !== 'professional' || !ctx.organizationId) {
      return NextResponse.json({ error: 'Accès réservé aux professionnels' }, { status: 403 });
    }

    const result = await reminderService.checkAndSendReminders(ctx.organizationId);
    return NextResponse.json({ success: true, count: result?.sent ?? 0 });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de la vérification des relances');
  }
}
