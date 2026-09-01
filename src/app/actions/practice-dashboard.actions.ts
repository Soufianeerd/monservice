'use server';

import { requireProfessional } from '@/lib/auth/session';
import { practiceDashboardService } from '@/lib/services/practice-dashboard.service';

export async function getPracticeDashboardAction() {
  const { organizationId } = await requireProfessional();
  return practiceDashboardService.getOverview(organizationId);
}
