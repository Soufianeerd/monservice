import { db } from '../db/server';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { User } from '../data/interfaces';

/**
 * Projection publique de la table `users`.
 *
 * La colonne `password` est volontairement absente. Toute lecture destinée à
 * être renvoyée au client doit passer par cette projection : l'ancienne
 * implémentation faisait `select()` sans projection et exposait les hachages
 * bcrypt (anomalie MS-003).
 */
const safeUserColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  profileType: users.profileType,
  organizationId: users.organizationId,
  onboardingCompleted: users.onboardingCompleted,
  onboardingStep: users.onboardingStep,
  subscriptionTier: users.subscriptionTier,
  subscriptionStatus: users.subscriptionStatus,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

/** Champs qu'un utilisateur est autorisé à modifier sur son propre profil. */
const UPDATABLE_PROFILE_FIELDS = ['name', 'onboardingCompleted', 'onboardingStep'] as const;

export const userService = {
  async getUserProfile(userId: string): Promise<User | null> {
    if (!userId) return null;
    try {
      const result = await db.select(safeUserColumns).from(users).where(eq(users.id, userId));
      if (!result[0]) return null;
      return result[0] as unknown as User;
    } catch (err) {
      console.error('Erreur lors de la lecture du profil utilisateur:', err);
      return null;
    }
  },

  /**
   * Membres d'une organisation, sans hachage de mot de passe.
   *
   * Remplace l'ancien `getAllUsers()` qui renvoyait toute la base, hachages
   * compris et sans authentification (anomalie MS-003).
   */
  async listByOrganization(organizationId: string): Promise<User[]> {
    if (!organizationId) return [];
    try {
      const results = await db
        .select(safeUserColumns)
        .from(users)
        .where(eq(users.organizationId, organizationId));
      return results as unknown as User[];
    } catch (err) {
      console.error("Erreur lors de la lecture des membres de l'organisation:", err);
      return [];
    }
  },

  /**
   * Vérifie l'existence d'un e-mail sans rien divulguer d'autre.
   * Utilisée uniquement côté serveur, à l'inscription.
   */
  async emailExists(email: string): Promise<boolean> {
    if (!email) return false;
    const normalized = email.trim().toLowerCase();
    const result = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized));
    return result.length > 0;
  },

  /**
   * Crée le profil applicatif associé à un compte Supabase Auth.
   *
   * L'identifiant est IMPOSÉ : c'est celui de `auth.users`. C'est cette
   * égalité qui permet à `getSessionContext()` de relier l'identité Supabase
   * au profil métier.
   *
   * Aucun mot de passe n'est stocké ici : depuis la migration vers Supabase
   * Auth, les identifiants vivent exclusivement dans `auth.users`.
   */
  async createProfile(data: {
    id: string;
    name: string;
    email: string;
    profileType: string;
    organizationId?: string;
  }): Promise<User> {
    const now = new Date().toISOString();

    const newProfile = {
      id: data.id,
      name: data.name,
      email: data.email.trim().toLowerCase(),
      profileType: data.profileType,
      organizationId: data.organizationId ?? null,
      onboardingCompleted: false,
      onboardingStep: 0,
      subscriptionTier: 'free',
      subscriptionStatus: 'inactive',
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(users).values(newProfile as unknown as typeof users.$inferInsert);

    return newProfile as unknown as User;
  },

  /**
   * Met à jour le profil d'un utilisateur.
   *
   * Défense en profondeur : même si l'appelant transmet des champs non
   * autorisés, seuls ceux de `UPDATABLE_PROFILE_FIELDS` sont écrits. La
   * validation zod (`profileUpdateSchema`) reste la première barrière.
   */
  async updateUserProfile(userId: string, updateData: Partial<User>): Promise<User | null> {
    if (!userId) return null;
    try {
      const filtered: Record<string, unknown> = {};
      for (const field of UPDATABLE_PROFILE_FIELDS) {
        const value = updateData[field as keyof User];
        if (value !== undefined) filtered[field] = value;
      }

      if (Object.keys(filtered).length === 0) {
        return this.getUserProfile(userId);
      }

      filtered.updatedAt = new Date().toISOString();

      await db.update(users).set(filtered).where(eq(users.id, userId));

      return this.getUserProfile(userId);
    } catch (err) {
      console.error('Erreur lors de la mise à jour du profil utilisateur:', err);
      return null;
    }
  },

  /** Associe l'identifiant client Stripe. Réservé au webhook. */
  async setStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
    await db
      .update(users)
      .set({ stripeCustomerId, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId));
  },

  /**
   * Mise à jour de l'état d'abonnement.
   *
   * ⚠️ RÉSERVÉ AU WEBHOOK STRIPE. Contourne volontairement la liste blanche
   * ci-dessus : c'est le seul chemin autorisé pour modifier les droits payants
   * (anomalies MS-004 et MS-014).
   */
  async updateSubscriptionFromStripeWebhook(
    userId: string,
    subscription: { subscriptionTier: string; subscriptionStatus: string },
  ): Promise<void> {
    await db
      .update(users)
      .set({
        subscriptionTier: subscription.subscriptionTier,
        subscriptionStatus: subscription.subscriptionStatus,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));

    console.info('[audit] user.subscription.updated', {
      userId,
      ...subscription,
      at: new Date().toISOString(),
    });
  },
};
