import { CLIENT_ACCESS_CLOSED_MESSAGE, isClientAccessEnabled } from '@/lib/launch/client-access';
import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db/server';
import { users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { hasVerifiedSecondFactor } from '@/lib/auth/two-factor/session-cookie';

/** Verified Neon session → stable application identity → stored tenant/profile.
 * Identity is installed by the DB adapter transaction-locally. Browser fields
 * never provide security context. Every protected action uses these helpers.
 */
export type SessionContext = {
  userId: string;
  organizationId: string | null;
  profileType: 'client' | 'professional' | string;
  email: string | null;
};

export type OrganizationContext = SessionContext & { organizationId: string };

type ResolvedSession = { context: SessionContext | null; secondFactorPending: boolean };

const resolveSession = cache(async (): Promise<ResolvedSession> => {
  // The DB adapter verifies Neon Auth and installs the provider identity inside
  // this query's transaction. SQL resolves the stable app ID and denies closure.
  const profile = await db
    .select({
      id: users.id,
      email: users.email,
      accountClosedAt: users.accountClosedAt,
      profileType: users.profileType,
      organizationId: users.organizationId,
      // Même instruction SQL : aucun aller-retour de plus par requête.
      twoFactorEnabled: sql<boolean>`public.two_factor_enabled()`,
    })
    .from(users)
    .where(eq(users.id, sql`public.current_app_user_id()`));

  const row = profile[0];
  if (!row || row.accountClosedAt) return { context: null, secondFactorPending: false };

  const context: SessionContext = {
    userId: row.id,
    email: row.email,
    organizationId: row.organizationId ?? null,
    profileType: row.profileType,
  };
  // Double authentification active : sans preuve liée à cette session, le
  // compte est traité comme non connecté par toutes les actions et pages.
  if (row.twoFactorEnabled && !(await hasVerifiedSecondFactor(row.id))) {
    return { context, secondFactorPending: true };
  }
  return { context, secondFactorPending: false };
});

/**
 * Contexte si une session valide existe, `null` sinon. Ne lève jamais.
 *
 * `cache()` mémoïse le résultat pour la durée d'une même requête : le profil
 * n'est lu qu'une fois même si plusieurs actions l'appellent.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const resolved = await resolveSession();
  return resolved.secondFactorPending ? null : resolved.context;
});

/**
 * Compte connecté par mot de passe mais dont le second facteur reste à
 * vérifier. Réservé à la page et à l'action de vérification.
 */
export const getPendingSecondFactorContext = cache(async (): Promise<SessionContext | null> => {
  const resolved = await resolveSession();
  return resolved.secondFactorPending ? resolved.context : null;
});

/** Contexte utilisateur authentifié. Lève 401 sinon. */
export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw new AppError('Authentification requise', 401, 'UNAUTHENTICATED');
  // Périmètre V1 : un compte client existant ne peut exécuter aucune action
  // serveur tant que les espaces clients sont fermés (voir lib/launch).
  if (ctx.profileType === 'client' && !isClientAccessEnabled()) {
    throw new AppError(CLIENT_ACCESS_CLOSED_MESSAGE, 403, 'CLIENT_ACCESS_DISABLED');
  }
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
