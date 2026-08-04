'use server';

import { dashboardService } from '@/lib/services/dashboard.service';
import { cookies } from 'next/headers';

export async function getProfessionalStatsAction(organizationId?: any) {
  return await dashboardService.getProfessionalStats(organizationId);
}

export async function getClientStatsAction(userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await dashboardService.getClientStats(userId);
}

