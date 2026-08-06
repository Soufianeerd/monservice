'use server';

import { clientService } from '@/lib/services/client.service';
import { requireProfessional } from '@/lib/auth/session';
import { assertQuota } from '@/lib/billing/quota';

/**
 * Server actions — clients.
 *
 * Les paramètres préfixés par `_` sont conservés pour ne pas casser les
 * appelants existants, mais leur valeur est **délibérément ignorée** :
 * l'identité et l'organisation proviennent exclusivement de la session
 * serveur (anomalies MS-002, MS-005, MS-006).
 *
 * TODO(P2) : retirer ces paramètres et nettoyer les sites d'appel.
 */

export async function findAllAction(_legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return clientService.findAll(organizationId);
}

export async function findByIdAction(id: string, _legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return clientService.findById(id, organizationId);
}

export async function createAction(data: Record<string, unknown>, _legacyUserId?: unknown) {
  const ctx = await requireProfessional();
  const { organizationId, userId } = ctx;
  // Quota du plan appliqué côté serveur (anomalie MS-019).
  await assertQuota(ctx, 'clients');
  // L'organisation est forcée côté serveur : un client ne peut pas être créé
  // dans une organisation tierce en manipulant le corps de la requête.
  return clientService.create({ ...data, organizationId } as never, userId);
}

export async function updateAction(
  id: string,
  _legacyOrganizationId: unknown,
  data: Record<string, unknown>,
  _legacyUserId?: unknown,
) {
  const { organizationId, userId } = await requireProfessional();
  return clientService.update(id, organizationId, data as never, userId);
}

export async function deleteWithCascadeAction(
  id: string,
  _legacyOrganizationId?: unknown,
  _legacyUserId?: unknown,
) {
  const { organizationId, userId } = await requireProfessional();
  return clientService.deleteWithCascade(id, organizationId, userId);
}
