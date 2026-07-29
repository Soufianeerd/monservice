'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organization } from '@/lib/data/interfaces';
import { organizationRepository } from '@/lib/data'; // Organization will be migrated in Session 3
import { userService } from '@/lib/services/user.service';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Session } from '@supabase/supabase-js';
import { cleanupLocalStorage } from '@/utils/storage-cleanup';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password?: string, orgName?: string, profileType?: User['profileType'], sector?: string) => Promise<{ success: boolean; error?: string }>;
  updateUser: (data: Partial<User>) => Promise<void>;
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      
      if (currentSession?.user) {
        cleanupLocalStorage(); // Clean old local storage if logged in via Supabase
        
        const storedUserId = currentSession.user.id;
        const foundUser = await userService.getUserProfile(storedUserId);
        if (foundUser) {
          setUser(foundUser);
          if (foundUser.organizationId) {
            const org = await organizationRepository.getById(foundUser.organizationId);
            setOrganization(org);
          }
        } else {
          // Fallback if the user exists in auth but not in the 'users' table yet
          setUser({
            id: storedUserId,
            name: currentSession.user.user_metadata?.name || 'Utilisateur',
            email: currentSession.user.email || '',
            role: 'member',
            profileType: currentSession.user.user_metadata?.profileType || 'client',
            onboardingCompleted: false,
            onboardingStep: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        setUser(null);
        setOrganization(null);
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) {
        cleanupLocalStorage();
        
        const storedUserId = initialSession.user.id;
        const foundUser = await userService.getUserProfile(storedUserId);
        if (foundUser) {
          setUser(foundUser);
          if (foundUser.organizationId) {
            const org = await organizationRepository.getById(foundUser.organizationId);
            setOrganization(org);
          }
        } else {
          setUser({
            id: storedUserId,
            name: initialSession.user.user_metadata?.name || 'Utilisateur',
            email: initialSession.user.email || '',
            role: 'member',
            profileType: initialSession.user.user_metadata?.profileType || 'client',
            onboardingCompleted: false,
            onboardingStep: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
      setIsLoading(false);
    });

    // Auto-refresh session every 5 minutes (300000ms)
    refreshInterval = setInterval(async () => {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('Failed to refresh session passively:', error.message);
      } else if (data.session) {
        setSession(data.session);
      }
    }, 300000);

    return () => {
      subscription?.subscription?.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [supabase]);

  const login = async (email: string, password?: string) => {
    if (!password) return { success: false, error: 'Mot de passe requis' };
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Login error:', error.message);
        if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
          return { success: false, error: 'Erreur réseau. Vérifiez votre connexion internet.' };
        }
        return { success: false, error: 'Identifiants incorrects.' };
      }
      return { success: true };
    } catch (err: any) {
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            profileType,
          },
        },
      });

      if (error || !data.user) {
        console.error('Signup error:', error?.message);
        if (error?.message.includes('Failed to fetch') || error?.message.includes('Network Error')) {
          return { success: false, error: 'Erreur réseau. Vérifiez votre connexion internet.' };
        }
        return { success: false, error: 'Erreur lors de l\'inscription. Cet email est peut-être déjà utilisé.' };
      }

      // Organization management remains local for now
      let orgId = undefined;
      if (orgName && profileType === 'professional') {
        const newOrg = await organizationRepository.create({
          name: orgName,
          industry: sector || 'Non spécifié',
          sector,
          profileType: 'professional',
          isPublic: true,
          country: 'France',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        orgId = newOrg.id;
        setOrganization(newOrg);
      }

      // We attempt to create the user in the Supabase 'users' table if it exists
      await supabase.from('users').insert([{
        id: data.user.id,
        name,
        email,
        role: 'admin',
        profileType: profileType || 'client',
        sector,
        onboardingCompleted: false,
        onboardingStep: 0,
        organizationId: orgId,
      }]);

      return { success: true };
    } catch (err: any) {
      console.error('Unexpected register error:', err);
      return { success: false, error: 'Le serveur est temporairement indisponible.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrganization(null);
    cleanupLocalStorage();
    router.push('/');
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    const updated = await userService.updateUserProfile(user.id, data);
    if (updated) {
      setUser(updated);
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
