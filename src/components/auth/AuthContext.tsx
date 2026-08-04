'use client';

import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Organization } from '@/lib/data/interfaces';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  session: Session | null;
  isLoading: boolean;
  signIn: typeof signIn;
  signOut: typeof signOut;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [prevSession, setPrevSession] = useState<Session | null>(null);

  // Sync state with session during rendering to avoid effect cascading renders
  if (session !== prevSession) {
    setPrevSession(session);
    if (session?.user) {
      const sessionUser = session.user as User;
      setUser(sessionUser);
      if (!sessionUser.organizationId) {
        setOrganization(null);
      }
    } else {
      setUser(null);
      setOrganization(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadOrg(orgId: string) {
      try {
        const { getOrganizationAction } = await import('@/app/actions/session');
        const org = await getOrganizationAction(orgId);
        if (mounted) setOrganization(org);
      } catch (err) {
        console.error('Error loading organization:', err);
      }
    }

    if (session?.user) {
      const sessionUser = session.user as User;
      if (sessionUser.organizationId) {
        loadOrg(sessionUser.organizationId);
      }
    }

    return () => { mounted = false; };
  }, [session]);

  const updateUser = async (data: Partial<User>) => {
    if (!user?.id) return;
    try {
      const { updateUserAction } = await import('@/app/actions/session');
      await updateUserAction(user.id, data);
      setUser(prev => prev ? { ...prev, ...data } : prev);
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  const value = {
    user,
    organization,
    session,
    isLoading: status === 'loading',
    signIn,
    signOut,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
