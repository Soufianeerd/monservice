'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, Organization } from '@/lib/data/interfaces';

/**
 * Contexte d'authentification — Supabase Auth.
 *
 * Le profil applicatif (`profileType`, `organizationId`, onboarding) ne vit
 * pas dans Supabase Auth mais dans la table `public.users`. Il est chargé via
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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

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
    const timer = setTimeout(() => {
      void loadProfile();
    }, 0);

    // Recharge le profil à chaque changement d'état d'authentification
    // (connexion, déconnexion, rafraîchissement de jeton).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setOrganization(null);
        setIsLoading(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        void loadProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase, loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
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
    },
    [supabase, loadProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrganization(null);
    window.location.href = '/login';
  }, [supabase]);

  const updateUser = useCallback(
    async (data: Partial<User>) => {
      try {
        const { updateUserAction } = await import('@/app/actions/session');
        await updateUserAction(data as Record<string, unknown>);
        await loadProfile();
      } catch (err) {
        console.error('Erreur lors de la mise à jour du profil:', err);
      }
    },
    [loadProfile],
  );

  const value = useMemo(
    () => ({ user, organization, isLoading, signIn, signOut, refresh: loadProfile, updateUser }),
    [user, organization, isLoading, signIn, signOut, loadProfile, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
