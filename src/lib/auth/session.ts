import 'server-only';
import { cache } from 'react';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/lib/db/server';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

/**
 * Contexte d'exécution serveur — implémentation Supabase Auth.
 *
 * RÈGLE FONDAMENTALE DU PROJET :
 * l'identité de l'appelant et son organisation ne doivent JAMAIS provenir
 * d'un paramètre de server action, d'un corps de requête, d'une query string
 * ou d'un cookie applicatif non signé. Elles sont exclusivement reconstruites
 * ici, à partir du jeton Supabase validé côté serveur.
 *
 * Toute server action et toute route API qui touche à des données doit
 * commencer par `requireSession()`, `requireOrganization()` ou
 * `requireProfessional()`.
 *
 * NOTE D'ARCHITECTURE — pourquoi cette abstraction existe :
 * la bascule NextAuth → Supabase Auth n'a nécessité de modifier que ce
 * fichier. Les 19 fichiers de server actions et les routes API n'ont pas
 * changé. Ne pas court-circuiter ce module en appelant directement
 * `supabase.auth.getUser()` ailleurs.
 */
export type SessionContext = {
  userId: string;
  organizationId: string | null;
  profileType: 'client' | 'professional' | string;
  email: string | null;
};

export type OrganizationContext = SessionContext & { organizationId: string };

/**
 * Contexte si une session valide existe, `null` sinon. Ne lève jamais.
 *
 * `cache()` mémoïse le résultat pour la durée d'une même requête : le profil
 * n'est lu qu'une fois même si plusieurs actions l'appellent.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();

  // `getUser()` valide le jeton auprès du serveur Supabase.
  // Ne jamais utiliser `getSession()` côté serveur : il fait confiance au
  // cookie sans le vérifier.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // `profileType` et `organizationId` vivent dans la table applicative
  // `public.users`, dont l'identifiant est celui de `auth.users`.
  const profile = await db
    .select({
      profileType: users.profileType,
      organizationId: users.organizationId,
    })
    .from(users)
    .where(eq(users.id, user.id));

  if (!profile[0]) {
    // L'utilisateur existe dans Supabase Auth mais n'a pas de profil
    // applicatif : le déclencheur `handle_new_user` n'a pas fonctionné, ou le
    // profil a été supprimé. On ne devine pas de valeurs par défaut.
    console.error('[auth] utilisateur sans profil applicatif', { userId: user.id });
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    organizationId: profile[0].organizationId ?? null,
    profileType: profile[0].profileType,
  };
});

/** Contexte utilisateur authentifié. Lève 401 sinon. */
export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw new AppError('Authentification requise', 401, 'UNAUTHENTICATED');
  return ctx;
}

/** Contexte utilisateur rattaché à une organisation. Lève 401/403 sinon. */
export async function requireOrganization(): Promise<OrganizationContext> {
  const ctx = await requireSession();
  if (!ctx.organizationId) {
    throw new AppError('Aucune organisation associée à ce compte', 403, 'NO_ORGANIZATION');
  }
  return ctx as OrganizationContext;
}

/** Contexte restreint à un ou plusieurs `profileType`. Lève 403 sinon. */
export async function requireProfileType(
  ...allowed: Array<'client' | 'professional'>
): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!allowed.includes(ctx.profileType as 'client' | 'professional')) {
    throw new AppError('Accès refusé pour ce type de profil', 403, 'FORBIDDEN_PROFILE');
  }
  return ctx;
}

/**
 * Contexte d'un professionnel rattaché à une organisation.
 * Raccourci pour la quasi-totalité des actions du CRM.
 */
export async function requireProfessional(): Promise<OrganizationContext> {
  const ctx = await requireOrganization();
  if (ctx.profileType !== 'professional') {
    throw new AppError('Accès réservé aux comptes professionnels', 403, 'FORBIDDEN_PROFILE');
  }
  return ctx;
}
