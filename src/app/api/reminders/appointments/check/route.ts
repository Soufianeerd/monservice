import { NextResponse } from 'next/server';
import { appointmentReminderService } from '@/lib/services/appointment-reminder.service';
import { getSessionContext } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/api-response';

/**
 * Route CRON pour le traitement des rappels de rendez-vous par email (24h et 2h).
 * Authentification stricte via en-tête x-cron-secret ou session praticien/organisation.
 */
export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = req.headers.get('x-cron-secret');
    const isCron = Boolean(cronSecret && cronSecret.length > 0) && providedSecret === cronSecret;

    if (isCron) {
      const result = await appointmentReminderService.processAppointmentReminders();
      return NextResponse.json({ success: true, ...result });
    }

    const ctx = await getSessionContext();
    if (!ctx || ctx.profileType !== 'professional' || !ctx.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const result = await appointmentReminderService.processAppointmentReminders({
      organizationId: ctx.organizationId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, 'Erreur lors du traitement des rappels de rendez-vous');
  }
}
