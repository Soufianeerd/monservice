'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalRouteError({
  error,
  retry,
  reset,
}: {
  error: unknown;
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const tryAgain = () => {
    const recover = retry ?? reset;
    if (recover) recover();
    else window.location.reload();
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div role="alert" className="w-full max-w-md bg-white rounded-xl shadow p-8 space-y-4" data-testid="route-error">
        <h1 className="text-xl font-bold text-gray-900">Une erreur est survenue</h1>
        <p className="text-sm text-gray-600">
          Votre saisie n’a peut-être pas été enregistrée. Réessayez ; si le problème persiste, revenez au tableau de bord.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={tryAgain}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Réessayer
          </button>
          <Link href="/dashboard" className="rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </main>
  );
}
