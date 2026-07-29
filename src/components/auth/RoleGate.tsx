'use client';

import React from 'react';
import { useAuth } from './AuthContext';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: ('client' | 'professional' | 'admin')[];
  fallback?: React.ReactNode;
}

export function RoleGate({ children, allowedRoles, fallback = null }: RoleGateProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="animate-pulse flex items-center justify-center p-4">Chargement...</div>;
  if (!user) return <>{fallback}</>;

  const profileType = user.profileType;
  if (!profileType || !allowedRoles.includes(profileType)) return <>{fallback}</>;

  return <>{children}</>;
}
