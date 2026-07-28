'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organization } from '@/lib/data/interfaces';
import { userRepository, organizationRepository } from '@/lib/data';
import { useRouter } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { createClient } from '@/utils/supabase/client';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password?: string, orgName?: string, profileType?: User['profileType'], sector?: string) => Promise<boolean>;
  updateUser: (data: Partial<User>) => Promise<void>;
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
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (session?.user) {
        const storedUserId = session.user.id;
        const foundUser = await userRepository.getById(storedUserId);
        if (foundUser) {
          setUser(foundUser);
          if (foundUser.organizationId) {
            const org = await organizationRepository.getById(foundUser.organizationId);
            setOrganization(org);
          }
        }
      } else {
        setUser(null);
        setOrganization(null);
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const storedUserId = session.user.id;
        const foundUser = await userRepository.getById(storedUserId);
        if (foundUser) {
          setUser(foundUser);
          if (foundUser.organizationId) {
            const org = await organizationRepository.getById(foundUser.organizationId);
            setOrganization(org);
          }
        }
      }
      setIsLoading(false);
    });

    return () => subscription?.subscription?.unsubscribe();
  }, [supabase]);

  const login = async (email: string, password?: string) => {
    if (!password) return false;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Login error:', error);
        return false;
      }
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password?: string, orgName?: string, profileType?: User['profileType'], sector?: string) => {
    if (!password) return false;
    setIsLoading(true);
    try {
      // 1. Sign up in Supabase
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
        console.error('Signup error:', error);
        return false;
      }

      // 2. Create in our local repository
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) return false;

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

      const hashedPassword = bcrypt.hashSync(password, 10);

      const newUser = await userRepository.create({
        id: data.user.id,
        name,
        email,
        password: hashedPassword,
        role: 'admin',
        profileType: profileType || 'client',
        sector,
        onboardingCompleted: false,
        onboardingStep: 0,
        organizationId: orgId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setUser(newUser);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrganization(null);
    router.push('/');
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    const updateData = { ...data };
    if (updateData.password) {
      updateData.password = bcrypt.hashSync(updateData.password, 10);
    }
    const updated = await userRepository.update(user.id, updateData);
    if (updated) {
      setUser(updated);
    }
  };

  return (
    <AuthContext.Provider value={{ user, organization, isLoading, login, logout, register, updateUser }}>
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
