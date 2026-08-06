'use server';

import { productService } from '@/lib/services/product.service';
import { requireProfessional } from '@/lib/auth/session';
import { assertQuota } from '@/lib/billing/quota';

/**
 * Les paramètres préfixés par `_` sont conservés pour la compatibilité des
 * appelants, mais leur valeur est ignorée : l'identité et l'organisation
 * proviennent exclusivement de la session serveur (MS-002, MS-005, MS-006).
 */

export async function findAllAction(_legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return productService.findAll(organizationId);
}

export async function findByIdAction(id: string, _legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return productService.findById(id, organizationId);
}

export async function createAction(data: Record<string, unknown>, _legacyUserId?: unknown) {
  const ctx = await requireProfessional();
  const { organizationId, userId } = ctx;
  await assertQuota(ctx, 'products');
  return productService.create({ ...data, organizationId } as never, userId);
}

export async function updateAction(
  id: string,
  _legacyOrganizationId: unknown,
  data: Record<string, unknown>,
  _legacyUserId?: unknown,
) {
  const { organizationId, userId } = await requireProfessional();
  return productService.update(id, organizationId, data as never, userId);
}

export async function deleteAction(id: string, _legacyOrganizationId?: unknown, _legacyUserId?: unknown) {
  const { organizationId, userId } = await requireProfessional();
  return productService.delete(id, organizationId, userId);
}
