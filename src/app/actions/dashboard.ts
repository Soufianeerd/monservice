'use server';

import { dashboardService } from '@/lib/services/dashboard.service';
import { dealService } from '@/lib/services/deal.service';

export async function getDashboardStatsAction(organizationId: string) {
  return await dashboardService.getProfessionalStats(organizationId);
}

export async function getDashboardDealsAction(organizationId: string) {
  return await dealService.findAll(organizationId);
}
