'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Chargement...</div>;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
          Bienvenue sur MonService
        </h1>
        <p className="text-xl text-gray-600">
          Projet en cours de construction. L&apos;ossature technique et la couche de données locale sont en place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 transition-colors shadow-sm w-full sm:w-auto"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-3 border border-indigo-600 text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 md:py-4 md:text-lg md:px-10 transition-colors shadow-sm w-full sm:w-auto"
          >
            S&apos;inscrire
          </Link>
        </div>
        <div className="pt-4">
          <Link
            href="/demo"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 underline"
          >
            Ou voir la démo publique sans connexion &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
