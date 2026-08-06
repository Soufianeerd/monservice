'use server';

import { messageService } from '@/lib/services/message.service';
import { requireSession } from '@/lib/auth/session';

/**
 * Server actions — messagerie.
 *
 * Toutes les opérations sont ancrées sur l'utilisateur de la session :
 * l'ancienne version acceptait un `userId` arbitraire et permettait de lire
 * ou de marquer comme lus les messages d'autrui (MS-027).
 */

export async function getMessagesByRequestIdAction(requestId: string) {
  const { userId } = await requireSession();
  // Filtrage sur la participation : seuls les messages dont l'appelant est
  // émetteur ou destinataire sont renvoyés.
  return messageService.getMessagesByRequestIdForUser(requestId, userId);
}

export async function getConversationAction(_legacyUserId1: unknown, otherUserId: string) {
  const { userId } = await requireSession();
  return messageService.getConversation(userId, otherUserId);
}

export async function findByUserAction(_legacyUserId?: unknown) {
  const { userId } = await requireSession();
  return messageService.findByUser(userId);
}

export async function getUnreadCountAction(_legacyUserId?: unknown) {
  const { userId } = await requireSession();
  return messageService.getUnreadCount(userId);
}

export async function markAsReadAction(messageIds: string[]) {
  const { userId } = await requireSession();
  // On ne peut marquer comme lus que les messages dont on est destinataire.
  return messageService.markAsRead(messageIds, userId);
}

export async function markThreadAsReadAction(_legacyUserId: unknown, otherUserId: string) {
  const { userId } = await requireSession();
  return messageService.markThreadAsRead(userId, otherUserId);
}

export async function createAction(data: Record<string, unknown>, _legacyUserId?: unknown) {
  const { userId, organizationId } = await requireSession();
  // L'émetteur est imposé par la session : impossible d'écrire au nom d'autrui.
  return messageService.create(
    { ...data, senderId: userId, organizationId: organizationId ?? '' } as never,
    userId,
  );
}
