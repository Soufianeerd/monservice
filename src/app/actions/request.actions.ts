'use server';

import { requestService } from '@/lib/services/request.service';
import { requireSession } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { requestSchema } from '@/lib/validation/schemas';
import type { Request } from '@/lib/data/interfaces/request.interface';

/**
 * Server actions — demandes de la marketplace.
 */

/**
 * Ne renvoie que les demandes publiques.
 * L'ancienne version exposait aussi les demandes privées (MS-026).
 */
export async function findAllAction(): Promise<Request[]> {
  const { userId } = await requireSession();
  return requestService.findPublic(userId);
}

export async function findPublicAction(): Promise<Request[]> {
  const { userId } = await requireSession();
  return requestService.findPublic(userId);
}

/** Une demande privée n'est visible que par son auteur. */
export async function findByIdAction(id: string): Promise<Request | null> {
  const { userId } = await requireSession();
  const request = await requestService.findById(id);
  if (!request) return null;

  if (!request.isPublic && request.clientId !== userId) {
    throw new AppError('Accès refusé à cette demande', 403, 'FORBIDDEN');
  }

  return request;
}

/** Demandes du client connecté uniquement. */
export async function findByClientIdAction(_legacyClientId?: unknown): Promise<Request[]> {
  const { userId } = await requireSession();
  return requestService.findByClientId(userId);
}

export async function createAction(data: Record<string, unknown>, _legacyUserId?: unknown): Promise<Request> {
  const { userId } = await requireSession();
  const validated = requestSchema.parse({
    ...data,
    clientId: userId,
  });

  return requestService.create(
    {
      title: validated.title,
      description: validated.description,
      category: validated.category,
      location: validated.location || '',
      budget: validated.budget,
      preferredDate: validated.deadline,
      status: validated.status === 'open' ? 'published' : validated.status,
      isPublic: validated.visibility === 'public',
      clientId: userId,
    },
    userId
  );
}

export async function updateAction(
  id: string,
  data: Partial<Omit<Request, 'id' | 'createdAt' | 'updatedAt'>>,
  _legacyUserId?: unknown
): Promise<Request | null> {
  const { userId } = await requireSession();
  return requestService.update(id, data, userId);
}

export async function publishAction(id: string, _legacyUserId?: unknown): Promise<Request | null> {
  const { userId } = await requireSession();
  return requestService.publish(id, userId);
}

export async function deleteAction(id: string, _legacyUserId?: unknown): Promise<boolean> {
  const { userId } = await requireSession();
  return requestService.delete(id, userId);
}
