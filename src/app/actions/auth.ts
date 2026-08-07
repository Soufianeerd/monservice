'use server';

import { organizationService } from '@/lib/services/organization.service';
import { userService } from '@/lib/services/user.service';
import { registerSchema } from '@/lib/validation/schemas';
import { createClient } from '@/utils/supabase/server';

/**
 * Inscription — Supabase Auth + profil applicatif.
 *
 * Le compte d'authentification vit dans `auth.users` (géré par Supabase) ;
 * le profil métier (`profileType`, `organizationId`, onboarding) vit dans
 * `public.users`, avec le MÊME identifiant. C'est cette égalité d'identifiant
 * qui permet à `getSessionContext()` de relier les deux.
 *
 * Changements par rapport à la version précédente :
 *  - validation stricte des entrées, politique de mot de passe appliquée ;
 *  - suppression de `role: 'admin'` codé en dur, qui écrivait une colonne
 *    inexistante dans le schéma (anomalie MS-034) ;
 *  - le compte est créé avec un abonnement `free` et un statut `inactive` :
 *    les droits payants ne peuvent venir que du webhook Stripe.
 */
export async function registerAction(data: {
  name: string;
  email: string;
  password?: string;
  orgName?: string;
  profileType?: 'client' | 'professional';
  sector?: string;
}): Promise<{
  success: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
  userId?: string;
}> {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? 'Données invalides.' };
  }

  const input = parsed.data;

  try {
    if (await userService.emailExists(input.email)) {
      return { success: false, error: 'Cet email est déjà utilisé.' };
    }

    const supabase = await createClient();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        // Les métadonnées sont indicatives : la source de vérité du
        // `profileType` reste la table `public.users`, non modifiable par
        // l'utilisateur (contrairement à `user_metadata`).
        data: { name: input.name, profileType: input.profileType },
      },
    });

    if (signUpError || !signUpData.user) {
      console.error("[auth] échec de l'inscription Supabase:", signUpError?.message);
      return { success: false, error: "Impossible de créer le compte." };
    }

    const authUserId = signUpData.user.id;

    let organizationId: string | undefined;

    try {
      const { db } = await import('@/lib/db/server');
      const { organizations, users } = await import('@/lib/db/schema');
      const { generateId } = await import('@/lib/utils/id-generator');

      await db.transaction(async (tx) => {
        if (input.profileType === 'professional' && input.orgName) {
          organizationId = generateId();
          await tx.insert(organizations).values({
            id: organizationId,
            name: input.orgName,
            industry: input.sector || 'Non spécifié',
            sector: input.sector,
            profileType: 'professional',
            isPublic: true,
            country: 'France',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as any);
        }

        const now = new Date().toISOString();
        await tx.insert(users).values({
          id: authUserId,
          name: input.name,
          email: input.email.trim().toLowerCase(),
          profileType: input.profileType,
          organizationId: organizationId ?? null,
          onboardingCompleted: false,
          onboardingStep: 0,
          subscriptionTier: 'free',
          subscriptionStatus: 'inactive',
          createdAt: now,
          updatedAt: now,
        } as any);
      });
    } catch (profileError) {
      // Le compte d'authentification existe désormais sans profil applicatif.
      // Sa suppression exige la clé `service_role`, indisponible ici : on
      // journalise explicitement pour permettre un rattrapage manuel.
      console.error('[auth] COMPTE ORPHELIN — profil applicatif non créé', {
        authUserId,
        email: input.email,
        error: profileError,
      });
      return {
        success: false,
        error: 'Compte partiellement créé. Contactez le support.',
      };
    }

    console.info('[audit] user.registered', {
      userId: authUserId,
      profileType: input.profileType,
      at: new Date().toISOString(),
    });

    // Si la confirmation d'e-mail est activée dans Supabase, aucune session
    // n'est ouverte tant que l'adresse n'est pas confirmée.
    const requiresEmailConfirmation = !signUpData.session;

    return { success: true, userId: authUserId, requiresEmailConfirmation };
  } catch (err: unknown) {
    console.error("Erreur à l'inscription:", err);
    // Message générique : ne jamais exposer le détail interne au client.
    return { success: false, error: 'Erreur serveur.' };
  }
}
