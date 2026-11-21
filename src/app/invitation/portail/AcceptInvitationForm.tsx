'use client';

import { useState } from 'react';
import { acceptClientPortalInvitationAction } from '@/app/actions/client-portal-invitation.actions';

export default function AcceptInvitationForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    setError(null);
    try {
      const result = await acceptClientPortalInvitationAction({ token });
      if (!result.ok) { setError(result.error); return; }
      window.location.href = '/client/dashboard';
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700" role="alert" data-testid="portal-invitation-error">{error}</p>}
      <button type="button" onClick={accept} disabled={pending} className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50" data-testid="portal-invitation-accept">
        {pending ? 'Activation…' : 'Accepter et accéder à mon espace'}
      </button>
    </div>
  );
}
