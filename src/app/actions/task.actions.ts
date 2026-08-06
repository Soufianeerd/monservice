'use server';

import { taskService } from '@/lib/services/task.service';
import { requireProfessional } from '@/lib/auth/session';

/**
 * Les paramètres préfixés par `_` sont conservés pour la compatibilité des
 * appelants, mais leur valeur est ignorée : l'identité et l'organisation
 * proviennent exclusivement de la session serveur (MS-002, MS-005, MS-006).
 */

export async function findAllAction(_legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return taskService.findAll(organizationId);
}

export async function findByOrganizationAction(_legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return taskService.findByOrganization(organizationId);
}

export async function findByIdAction(id: string, _legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return taskService.findById(id, organizationId);
}

export async function findByEntityAction(
  entityType: string,
  entityId: string,
  _legacyOrganizationId?: unknown,
) {
  const { organizationId } = await requireProfessional();
  return taskService.findByEntity(entityType, entityId, organizationId);
}

export async function createAction(data: Record<string, unknown>, _legacyUserId?: unknown) {
  const { organizationId, userId } = await requireProfessional();
  return taskService.create({ ...data, organizationId } as never, userId);
}

export async function updateAction(
  id: string,
  _legacyOrganizationId: unknown,
  data: Record<string, unknown>,
  _legacyUserId?: unknown,
) {
  const { organizationId, userId } = await requireProfessional();
  return taskService.update(id, organizationId, data as never, userId);
}

export async function markAsDoneAction(id: string, _legacyOrganizationId?: unknown, _legacyUserId?: unknown) {
  const { organizationId, userId } = await requireProfessional();
  return taskService.markAsDone(id, organizationId, userId);
}

export async function deleteAction(id: string, _legacyOrganizationId?: unknown, _legacyUserId?: unknown) {
  const { organizationId, userId } = await requireProfessional();
  return taskService.delete(id, organizationId, userId);
}
