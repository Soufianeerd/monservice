'use server';

import { notificationService } from '@/lib/services/notification.service';
import { requireProfessional } from '@/lib/auth/session';

/**
 * Les paramètres préfixés par `_` sont conservés pour la compatibilité des
 * appelants, mais leur valeur est ignorée : l'identité et l'organisation
 * proviennent exclusivement de la session serveur (MS-002, MS-005, MS-006).
 */

export async function generateNotificationsAction(_legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return notificationService.generateNotifications(organizationId);
}

export async function markAsReadAction(notificationId: string) {
  await requireProfessional();
  return notificationService.markAsRead(notificationId);
}

export async function markAllAsReadAction(_legacyOrganizationId?: unknown, _legacyUserId?: unknown) {
  const { organizationId, userId } = await requireProfessional();
  return notificationService.markAllAsRead(organizationId, userId);
}

export async function getUnreadCountAction(_legacyOrganizationId?: unknown, _legacyUserId?: unknown) {
  const { organizationId, userId } = await requireProfessional();
  return notificationService.getUnreadCount(organizationId, userId);
}
