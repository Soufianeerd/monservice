'use server';

import { calendarService } from '@/lib/services/calendar.service';
import { requireProfessional } from '@/lib/auth/session';

/**
 * Les paramètres préfixés par `_` sont conservés pour la compatibilité des
 * appelants, mais leur valeur est ignorée : l'identité et l'organisation
 * proviennent exclusivement de la session serveur (MS-002, MS-005, MS-006).
 */

export async function getEventsAction(
  _legacyOrganizationId?: unknown,
  startDate?: string,
  endDate?: string,
) {
  const { organizationId } = await requireProfessional();
  // Fenêtre par défaut identique à la page Calendrier : un an avant, deux ans après.
  const now = new Date();
  const from = startDate ?? new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate())).toISOString();
  const to = endDate ?? new Date(Date.UTC(now.getUTCFullYear() + 2, now.getUTCMonth(), now.getUTCDate())).toISOString();
  return calendarService.getEvents(organizationId, from, to);
}
