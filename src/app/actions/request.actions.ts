'use server';

import { requestService } from '@/lib/services/request.service';
import { requireSession } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';

/**
 * Server actions — demandes de la marketplace.
 */

/**
 * Ne renvoie que les demandes publiques.
 * L'ancienne version exposait aussi les demandes privées (MS-026).
 */
export async function findAllAction() {
  await requireSession();
  return requestService.findPublic();
}

export async function findPublicAction() {
  await requireSession();
  return requestService.findPublic();
}

/** Une demande privée n'est visible que par son auteur. */
export async function findByIdAction(id: string) {
  const { userId } = await requireSession();
  const request = await requestService.findById(id);
  if (!request) return null;

  if (!request.isPublic && request.clientId !== userId) {
    throw new AppError('Accès refusé à cette demande', 403, 'FORBIDDEN');
  }

  return request;
}

/** Demandes du client connecté uniquement. */
export async function findByClientIdAction(_legacyClientId?: unknown) {
  const { userId } = await requireSession();
  return requestService.findByClientId(userId);
}

export async function createAction(data: Record<string, unknown>, _legacyUserId?: unknown) {
  const { userId } = await requireSession();
  return requestService.create({ ...data, clientId: userId } as never, userId);
}

export async function updateAction(
  id: string,
  data: Record<string, unknown>,
  _legacyUserId?: unknown,
) {
  const { userId } = await requireSession();
  return requestService.update(id, data as never, userId);
}

export async function publishAction(id: string, _legacyUserId?: unknown) {
  const { userId } = await requireSession();
  return requestService.publish(id, userId);
}

export async function deleteAction(id: string, _legacyUserId?: unknown) {
  const { userId } = await requireSession();
  return requestService.delete(id, userId);
}
