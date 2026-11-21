'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { authClient } from '@/lib/auth/client';
import { User, Organization } from '@/lib/data/interfaces';

/**
 * Contexte d'authentification — Neon Auth.
 *
 * Le profil applicatif (`profileType`, `organizationId`, onboarding) ne vit
 * pas dans Neon Auth mais dans la table `public.users`. Il est chargé via
 * une server action après authentification.
 *
 * ⚠️ Ce contexte sert UNIQUEMENT à l'affichage. Aucune décision de sécurité
 * ne doit en dépendre : les contrôles réels sont côté serveur
 * (`requireSession()`), car tout ce qui vit dans le navigateur est
 * modifiable par l'utilisateur.
 */
interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  /** Profil déjà lu par le layout serveur : évite deux Server Actions au démarrage. */
  seed: (user: User, organization: Organization | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const providerSession = authClient.useSession();
  // Quand le layout serveur a fourni le profil, inutile de le relire :
  // seuls une connexion, une mise à jour ou un refresh explicite le rechargent.
  const seeded = useRef(false);

  const seed = useCallback((nextUser: User, nextOrganization: Organization | null) => {
    seeded.current = true;
    setUser(nextUser);
    setOrganization(nextOrganization);
    setIsLoading(false);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const { getSessionAction, getOrganizationAction } = await import('@/app/actions/session');
      const { user: profile } = await getSessionAction();

      setUser(profile ?? null);

      if (profile?.organizationId) {
        setOrganization(await getOrganizationAction());
      } else {
        setOrganization(null);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
      setUser(null);
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (seeded.current) return;
    const timer = setTimeout(() => {
      if (!seeded.current) void loadProfile();
    }, 0);

    return () => clearTimeout(timer);
  }, [providerSession.data?.user?.id, loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
      const { error } = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        // Message volontairement générique : ne jamais permettre de
        // distinguer « compte inexistant » de « mot de passe incorrect »
        // (énumération de comptes).
        return { error: 'Email ou mot de passe incorrect' };
      }

      await loadProfile();
      return { error: null };
      } catch {
        return { error: 'Email ou mot de passe incorrect' };
      }
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setUser(null);
    setOrganization(null);
    window.location.href = '/login';
  }, []);

  const updateUser = useCallback(
    async (data: Partial<User>) => {
      const { updateUserAction } = await import('@/app/actions/session');
      await updateUserAction(data as Record<string, unknown>);
      await loadProfile();
    },
    [loadProfile],
  );

  const value = useMemo(
    () => ({ user, organization, isLoading, signIn, signOut, refresh: loadProfile, updateUser, seed }),
    [user, organization, isLoading, signIn, signOut, loadProfile, updateUser, seed],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

/**
 * Transmet au contexte client le profil lu côté serveur par le layout.
 * Données d'affichage uniquement : la sécurité reste vérifiée côté serveur.
 */
export function SessionSeed({ user, organization }: { user: User; organization: Organization | null }) {
  const { seed } = useAuth();
  useLayoutEffect(() => {
    seed(user, organization);
  }, [seed, user, organization]);
  return null;
}
