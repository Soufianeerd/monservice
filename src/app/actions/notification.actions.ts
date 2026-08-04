'use server';

import { notificationService } from '@/lib/services/notification.service';
import { cookies } from 'next/headers';

export async function generateNotificationsAction(organizationId?: any) {
  return await notificationService.generateNotifications(organizationId);
}

export async function markAsReadAction(notificationId?: any) {
  return await notificationService.markAsRead(notificationId);
}

export async function markAllAsReadAction(organizationId?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await notificationService.markAllAsRead(organizationId, userId);
}

export async function getUnreadCountAction(organizationId?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await notificationService.getUnreadCount(organizationId, userId);
}

