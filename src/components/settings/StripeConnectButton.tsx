'use client';

import { useState } from 'react';

export default function StripeConnectButton({ organizationId, isConnected }: { organizationId: string, isConnected: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/connect/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Erreur lors de la connexion Stripe');
      }
    } catch (error) {
      console.error(error);
      alert('Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        <span className="text-sm font-medium">Compte Stripe connecté</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150 disabled:opacity-50"
    >
      {loading ? 'Redirection...' : 'Connecter mon compte Stripe'}
    </button>
  );
}
