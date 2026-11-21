import type { Metadata } from 'next';
import Link from 'next/link';
import { CLIENT_ACCESS_CLOSED_MESSAGE } from '@/lib/launch/client-access';
import SignOutButton from './SignOutButton';

export const metadata: Metadata = {
  title: 'Espace client indisponible',
  robots: { index: false, follow: false },
};

/**
 * Page d'information des comptes client existants pendant la V1. Elle ne lit
 * aucune session ni aucune donnée : elle reste affichable même quand toutes
 * les actions serveur refusent le profil client.
 */
export default function ClientAccessUnavailablePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8 space-y-4" data-testid="client-access-unavailable">
        <h1 className="text-xl font-bold text-gray-900">Espace client indisponible</h1>
        <p className="text-sm text-gray-600">{CLIENT_ACCESS_CLOSED_MESSAGE}</p>
        <p className="text-sm text-gray-600">
          Vos devis, factures et rendez-vous restent gérés par votre prestataire : contactez-le directement.
        </p>
        <div className="flex flex-col gap-2">
          <SignOutButton />
          <Link href="/" className="rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
