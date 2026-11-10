'use client';

import { useAuth } from './AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

// `/clients/...` (CRM du professionnel) ne doit pas être pris pour l'espace
// client `/client/...` : un simple startsWith('/client') renvoyait le
// professionnel au tableau de bord dès l'ouverture d'une fiche client.
export function isClientAreaPath(pathname: string): boolean {
  return pathname === '/client' || pathname.startsWith('/client/');
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else {
        if (user.profileType === 'client' && !isClientAreaPath(pathname) && !pathname.startsWith('/settings')) {
          router.push('/client/dashboard');
        } else if (user.profileType === 'professional' && isClientAreaPath(pathname)) {
          router.push('/dashboard');
        }
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-64 bg-gray-100 rounded-lg mt-6"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
