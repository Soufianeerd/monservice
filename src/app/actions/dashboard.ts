'use server';

/**
 * @deprecated Utiliser `dashboard.actions.ts`.
 * Ce fichier est conservé le temps de migrer les appelants ; il délègue
 * désormais aux actions sécurisées plutôt que d'exposer un second chemin
 * d'accès non contrôlé.
 */

import { dealService } from '@/lib/services/deal.service';
import { dashboardService } from '@/lib/services/dashboard.service';
import { requireProfessional } from '@/lib/auth/session';

export async function getDashboardStatsAction(_legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return dashboardService.getProfessionalStats(organizationId);
}

export async function getDashboardDealsAction(_legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return dealService.findAll(organizationId);
}
