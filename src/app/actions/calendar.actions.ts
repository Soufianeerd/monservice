'use server';

import { calendarService } from '@/lib/services/calendar.service';
import { cookies } from 'next/headers';

export async function getEventsAction(organizationId?: any, startDate?: any, endDate?: any) {
  return await calendarService.getEvents(organizationId, startDate, endDate);
}

