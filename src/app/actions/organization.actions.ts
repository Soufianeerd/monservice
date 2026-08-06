'use server';

import { organizationService } from '@/lib/services/organization.service';
import { requireOrganization, requireSession } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { organizationUpdateSchema } from '@/lib/validation/schemas';

/**
 * Server actions — organisation.
 *
 * L'ancienne version acceptait un identifiant arbitraire et un objet non
 * filtré : n'importe qui pouvait lire et modifier n'importe quelle
 * organisation, y compris ses coordonnées bancaires (MS-004, MS-012).
 */

export async function getByIdAction(id: string) {
  const ctx = await requireSession();

  // Un utilisateur ne peut consulter que sa propre organisation.
  if (ctx.organizationId !== id) {
    throw new AppError('Accès refusé à cette organisation', 403, 'FORBIDDEN');
  }

  return organizationService.getById(ctx.organizationId);
}

export async function updateAction(_legacyId: unknown, data: Record<string, unknown>) {
  const { organizationId, userId } = await requireOrganization();

  // Liste blanche stricte : tout champ inconnu est rejeté (affectation de masse).
  const validated = organizationUpdateSchema.parse(data);

  console.info('[audit] organization.updated', {
    organizationId,
    userId,
    fields: Object.keys(validated),
    at: new Date().toISOString(),
  });

  return organizationService.update(organizationId, validated);
}
