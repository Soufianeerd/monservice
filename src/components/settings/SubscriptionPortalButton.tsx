'use client';

import { useState } from 'react';

export default function SubscriptionPortalButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function open() {
    setPending(true); setError('');
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'La gestion de l’abonnement est indisponible.');
      window.location.assign(data.url);
    } catch (error) { setError(error instanceof Error ? error.message : 'Impossible d’ouvrir la gestion de l’abonnement.'); }
    finally { setPending(false); }
  }
  return <div>{error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}<button type="button" onClick={open} disabled={pending} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50">{pending ? 'Ouverture…' : 'Gérer mon abonnement MonService'}</button></div>;
}
