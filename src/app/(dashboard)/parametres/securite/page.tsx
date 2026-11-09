import { Metadata } from 'next';
import { requireSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Sécurité du compte | MonService',
  description: 'Gérez la sécurité de votre compte et l\'authentification à deux facteurs.',
};

export default async function SecurityPage() {
  await requireSession();

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Sécurité et Accès</h1>
      <p>L’authentification à deux facteurs n’est pas encore disponible. Aucun second facteur n’est activé sur ce compte.</p>
    </div>
  );
}
