'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organization } from '@/lib/data/interfaces';
import { useRouter } from 'next/navigation';
// Supabase imports removed
// import { createClient } from '@/utils/supabase/client';
// import { Session } from '@supabase/supabase-js';
import { cleanupLocalStorage } from '@/utils/storage-cleanup';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password?: string, orgName?: string, profileType?: User['profileType'], sector?: string) => Promise<{ success: boolean; error?: string }>;
  updateUser: (data: Partial<User>) => Promise<void>;
  session: unknown | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<unknown | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const { getSessionAction } = await import('@/app/actions/session');
        const { user: foundUser } = await getSessionAction();

        if (foundUser && mounted) {
          cleanupLocalStorage(); // Clean old local storage if logged in
          setUser(foundUser);
          if (foundUser.organizationId) {
            const { getOrganizationAction } = await import('@/app/actions/session');
            const org = await getOrganizationAction(foundUser.organizationId);
            setOrganization(org as Organization);
          }
        }
      } catch (err) {
        console.error('Error loading session:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password?: string) => {
    if (!password) return { success: false, error: 'Mot de passe requis' };
    setIsLoading(true);
    try {
      const { loginAction } = await import('@/app/actions/session');
      const result = await loginAction(email, password);
      
      if (!result.success) {
        return { success: false, error: result.error || 'Identifiants incorrects.' };
      }
      
      setUser(result.user as User);
      if (result.user?.organizationId) {
        const { getOrganizationAction } = await import('@/app/actions/session');
        const org = await getOrganizationAction(result.user.organizationId);
        setOrganization(org as Organization);
      }
      
      return { success: true };
    } catch (err: unknown) {
      console.error('Unexpected login error:', err);
      return { success: false, error: 'Le serveur est temporairement indisponible.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password?: string, orgName?: string, profileType?: User['profileType'], sector?: string) => {
    if (!password) return { success: false, error: 'Mot de passe requis' };
    setIsLoading(true);
    try {
      // Use dynamic import to avoid Server Action issues on client side if needed, 
      // or just import the action at the top. Since it's a 'use client' file, we can import server actions directly.
      const { registerAction } = await import('@/app/actions/auth');
      
      const result = await registerAction({
        name,
        email,
        password,
        orgName,
        profileType,
        sector
      });

      if (!result.success) {
        return { success: false, error: result.error || "Erreur lors de l'inscription." };
      }

      // Update local state with the newly created user
      setUser(result.user as User);
      
      if (result.user?.organizationId) {
        const { getOrganizationAction } = await import('@/app/actions/session');
        const org = await getOrganizationAction(result.user.organizationId);
        setOrganization(org as Organization);
      }

      return { success: true };
    } catch (err: unknown) {
      console.error('Unexpected register error:', err);
      return { success: false, error: 'Le serveur est temporairement indisponible.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const { logoutAction } = await import('@/app/actions/session');
      await logoutAction();
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setOrganization(null);
    cleanupLocalStorage();
    router.push('/');
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    const { updateUserAction } = await import('@/app/actions/session');
    const updated = await updateUserAction(user.id, data);
    if (updated) {
      setUser(updated as User);
    }
  };

  return (
    <AuthContext.Provider value={{ user, organization, isLoading, login, logout, register, updateUser, session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
