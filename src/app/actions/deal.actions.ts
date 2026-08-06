'use server';

import { dealService } from '@/lib/services/deal.service';
import { requireProfessional } from '@/lib/auth/session';

/**
 * Les paramètres préfixés par `_` sont conservés pour la compatibilité des
 * appelants, mais leur valeur est ignorée : l'identité et l'organisation
 * proviennent exclusivement de la session serveur (MS-002, MS-005, MS-006).
 */

export async function findAllAction(_legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return dealService.findAll(organizationId);
}

export async function findByClientIdAction(clientId: string, _legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return dealService.findByClientId(clientId, organizationId);
}

export async function findByIdAction(id: string, _legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return dealService.findById(id, organizationId);
}

export async function createAction(data: Record<string, unknown>, _legacyUserId?: unknown) {
  const { organizationId, userId } = await requireProfessional();
  return dealService.create({ ...data, organizationId } as never, userId);
}

export async function updateAction(
  id: string,
  _legacyOrganizationId: unknown,
  data: Record<string, unknown>,
  _legacyUserId?: unknown,
) {
  const { organizationId, userId } = await requireProfessional();
  return dealService.update(id, organizationId, data as never, userId);
}

export async function updateStatusAction(
  id: string,
  status: string,
  _legacyOrganizationId?: unknown,
  _legacyUserId?: unknown,
) {
  const { organizationId, userId } = await requireProfessional();
  return dealService.updateStatus(id, status as never, organizationId, userId);
}

export async function deleteAction(id: string, _legacyOrganizationId?: unknown, _legacyUserId?: unknown) {
  const { organizationId, userId } = await requireProfessional();
  return dealService.delete(id, organizationId, userId);
}
