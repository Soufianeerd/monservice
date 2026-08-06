'use server';

/**
 * @deprecated Utiliser `notification.actions.ts`.
 * Conservé le temps de migrer les appelants. Le service sous-jacent n'est pas
 * encore implémenté (anomalie MS-018) : ces actions renvoient des valeurs
 * neutres, mais exigent désormais une session valide.
 */

import { requireProfessional } from '@/lib/auth/session';

export async function getUnreadCountAction(_legacyOrganizationId?: unknown, _legacyUserId?: unknown) {
  await requireProfessional();
  return 0;
}

export async function generateNotificationsAction(_legacyOrganizationId?: unknown) {
  await requireProfessional();
  return [];
}

export async function markAsReadAction(_notificationId: string) {
  await requireProfessional();
}

export async function markAllAsReadAction(_legacyOrganizationId?: unknown, _legacyUserId?: unknown) {
  await requireProfessional();
}

export async function findAllAction(_legacyOrganizationId?: unknown) {
  await requireProfessional();
  return [];
}
