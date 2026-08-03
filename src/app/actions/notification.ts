'use server';

import { notificationService } from '@/lib/services/notification.service';
import { notificationRepository } from '@/lib/data';

export async function generateNotificationsAction(organizationId: string) {
  await notificationService.generateNotifications(organizationId);
}

export async function getUserNotificationsAction(userId: string) {
  return await notificationRepository.findByUser(userId);
}

export async function markNotificationAsReadAction(id: string) {
  await notificationService.markAsRead(id);
}

export async function markAllNotificationsAsReadAction(organizationId: string, userId: string) {
  await notificationService.markAllAsRead(organizationId, userId);
}
