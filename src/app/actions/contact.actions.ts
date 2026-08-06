'use server';

import { contactService } from '@/lib/services/contact.service';
import { requireProfessional } from '@/lib/auth/session';

/**
 * Les paramètres préfixés par `_` sont conservés pour la compatibilité des
 * appelants, mais leur valeur est ignorée : l'identité et l'organisation
 * proviennent exclusivement de la session serveur (MS-002, MS-005, MS-006).
 */

export async function findAllAction(_legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return contactService.findAll(organizationId);
}

export async function findByClientIdAction(clientId: string, _legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return contactService.findByClientId(clientId, organizationId);
}

export async function findByIdAction(id: string, _legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return contactService.findById(id, organizationId);
}

export async function createAction(data: Record<string, unknown>, _legacyUserId?: unknown) {
  const { organizationId, userId } = await requireProfessional();
  return contactService.create({ ...data, organizationId } as never, userId);
}

export async function updateAction(
  id: string,
  _legacyOrganizationId: unknown,
  data: Record<string, unknown>,
  _legacyUserId?: unknown,
) {
  const { organizationId, userId } = await requireProfessional();
  return contactService.update(id, organizationId, data as never, userId);
}

export async function deleteAction(id: string, _legacyOrganizationId?: unknown, _legacyUserId?: unknown) {
  const { organizationId, userId } = await requireProfessional();
  return contactService.delete(id, organizationId, userId);
}
