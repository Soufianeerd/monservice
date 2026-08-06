'use server';

import { messageTemplateService } from '@/lib/services/message-template.service';
import { requireProfessional } from '@/lib/auth/session';
import { assertFeature } from '@/lib/billing/quota';

/**
 * Les paramètres préfixés par `_` sont conservés pour la compatibilité des
 * appelants, mais leur valeur est ignorée : l'identité et l'organisation
 * proviennent exclusivement de la session serveur (MS-002, MS-005, MS-006).
 */

export async function findAllAction(_legacyOrganizationId?: unknown) {
  const ctx = await requireProfessional();
  await assertFeature(ctx, 'messageTemplates');
  return messageTemplateService.findAll(ctx.organizationId);
}

export async function getByIdAction(_id: string) {
  await requireProfessional();
  // TODO(P1) : implémenter (le service ne fournit pas encore cette méthode).
  return null;
}

export async function updateAction(_id: string, _data: Record<string, unknown>) {
  await requireProfessional();
  return null;
}

export async function createAction(_data: Record<string, unknown>) {
  await requireProfessional();
  return null;
}

export async function deleteAction(_id: string) {
  await requireProfessional();
  return null;
}
