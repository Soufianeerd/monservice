'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organization } from '@/lib/data/interfaces';
import { userRepository, organizationRepository } from '@/lib/data';
import { useRouter } from 'next/navigation';
import bcrypt from 'bcryptjs';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password?: string, orgName?: string) => Promise<boolean>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load session from local storage on mount
  useEffect(() => {
    async function loadSession() {
      const storedUserId = localStorage.getItem('monservice_user_id');
      if (storedUserId) {
        const foundUser = await userRepository.getById(storedUserId);
        if (foundUser) {
          setUser(foundUser);
          if (foundUser.organizationId) {
            const org = await organizationRepository.getById(foundUser.organizationId);
            setOrganization(org);
          }
        } else {
          localStorage.removeItem('monservice_user_id');
        }
      }
      setIsLoading(false);
    }
    loadSession();
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const foundUser = await userRepository.findByEmail(email);
      if (foundUser && password) {
        // Use bcrypt to compare password if it's a real hash, or simple comparison for dummy fixtures
        const isMatch = foundUser.password?.startsWith('$2a$') 
          ? bcrypt.compareSync(password, foundUser.password)
          : foundUser.password === password;

        if (isMatch) {
          setUser(foundUser);
          localStorage.setItem('monservice_user_id', foundUser.id);
          if (foundUser.organizationId) {
            const org = await organizationRepository.getById(foundUser.organizationId);
            setOrganization(org);
          }
          return true;
        }
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password?: string, orgName?: string) => {
    setIsLoading(true);
    try {
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) return false;

      let orgId = undefined;
      if (orgName) {
        const newOrg = await organizationRepository.create({
          name: orgName,
          industry: 'Non spécifié',
          country: 'France',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        orgId = newOrg.id;
        setOrganization(newOrg);
      }

      const hashedPassword = password ? bcrypt.hashSync(password, 10) : undefined;

      const newUser = await userRepository.create({
        name,
        email,
        password: hashedPassword,
        role: 'admin',
        organizationId: orgId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setUser(newUser);
      localStorage.setItem('monservice_user_id', newUser.id);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setOrganization(null);
    localStorage.removeItem('monservice_user_id');
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
