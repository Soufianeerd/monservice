'use server';

import { dashboardService } from '@/lib/services/dashboard.service';
import { requireProfessional, requireSession } from '@/lib/auth/session';

/**
 * Les paramètres préfixés par `_` sont conservés pour la compatibilité des
 * appelants, mais leur valeur est ignorée : l'identité et l'organisation
 * proviennent exclusivement de la session serveur (MS-002, MS-005, MS-006).
 */

export async function getProfessionalStatsAction(_legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return dashboardService.getProfessionalStats(organizationId);
}

export async function getClientStatsAction(_legacyUserId?: unknown) {
  const { userId } = await requireSession();
  return dashboardService.getClientStats(userId);
}
