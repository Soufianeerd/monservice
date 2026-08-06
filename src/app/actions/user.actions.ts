'use server';

import { userService } from '@/lib/services/user.service';
import { requireProfessional, requireSession } from '@/lib/auth/session';
import { profileUpdateSchema } from '@/lib/validation/schemas';

/**
 * Server actions — utilisateur.
 *
 * `createUserAction()` A ÉTÉ SUPPRIMÉE et ne doit pas être réintroduite :
 * elle permettait de créer un compte arbitraire, avec n'importe quel
 * `organizationId` ou niveau d'abonnement. La création de compte passe
 * exclusivement par `registerAction`.
 *
 * `getAllUsersAction()` renvoyait auparavant `SELECT * FROM users` sans
 * authentification, hachages bcrypt compris (MS-003). Le nom est conservé
 * pour ses trois appelants, mais le périmètre est désormais restreint aux
 * membres de l'organisation de l'appelant, sans mot de passe.
 *
 * La recherche d'utilisateur par e-mail n'est plus exposée non plus : depuis
 * la bascule vers Supabase Auth, les identifiants vivent dans `auth.users` et
 * l'application n'a plus à les manipuler.
 */

/**
 * Membres de l'organisation de l'appelant (pour l'assignation de tâches).
 *
 * @deprecated Renommer en `listOrganizationMembersAction` une fois les
 * appelants migrés.
 */
export async function getAllUsersAction() {
  const { organizationId } = await requireProfessional();
  return userService.listByOrganization(organizationId);
}

/** Profil de l'utilisateur connecté, sans le hachage du mot de passe. */
export async function getUserProfileAction(_legacyUserId?: unknown) {
  const { userId } = await requireSession();
  return userService.getUserProfile(userId);
}

/**
 * Mise à jour du profil de l'utilisateur connecté.
 *
 * L'identifiant cible provient de la session, jamais d'un paramètre, et le
 * schéma est strict : `email`, `password`, `organizationId`, `profileType`,
 * `subscriptionTier` et `subscriptionStatus` sont rejetés (MS-004).
 * Ces changements relèvent de flux dédiés avec réauthentification.
 */
export async function updateUserProfileAction(
  _legacyUserId: unknown,
  updateData: Record<string, unknown>,
) {
  const { userId } = await requireSession();
  const validated = profileUpdateSchema.parse(updateData);

  console.info('[audit] user.profile.updated', {
    userId,
    fields: Object.keys(validated),
    at: new Date().toISOString(),
  });

  return userService.updateUserProfile(userId, validated);
}
