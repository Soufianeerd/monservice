'use server';

import { organizationService } from '@/lib/services/organization.service';
import { userService } from '@/lib/services/user.service';
import { getSessionContext, requireSession } from '@/lib/auth/session';
import { profileUpdateSchema } from '@/lib/validation/schemas';

/** Session courante. Renvoie `{ user: null }` si aucune session valide. */
export async function getSessionAction() {
  const ctx = await getSessionContext();
  if (!ctx) return { user: null };

  const user = await userService.getUserProfile(ctx.userId);
  return { user };
}

/**
 * Organisation de l'utilisateur connecté.
 *
 * Aucun identifiant n'est accepté en paramètre : il provient de la session.
 * L'ancienne version acceptait un `id` arbitraire et renvoyait n'importe
 * quelle organisation (MS-005).
 */
export async function getOrganizationAction() {
  const ctx = await requireSession();
  if (!ctx.organizationId) return null;
  return organizationService.getById(ctx.organizationId);
}

/**
 * Mise à jour du profil courant.
 *
 * L'ancienne version acceptait un identifiant arbitraire et un `Partial<User>`
 * non filtré : n'importe qui pouvait modifier n'importe quel compte, y compris
 * son organisation et son abonnement (MS-004).
 */
export async function updateUserAction(data: Record<string, unknown>) {
  const { userId } = await requireSession();
  const validated = profileUpdateSchema.parse(data);
  return userService.updateUserProfile(userId, validated);
}
