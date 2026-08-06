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
  return calendarService.getEvents(organizationId, startDate as never, endDate as never);
}
