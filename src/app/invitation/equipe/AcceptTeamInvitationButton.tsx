'use client';

import { useState } from 'react';
import { acceptTeamInvitationAction } from '@/app/actions/team.actions';

export default function AcceptTeamInvitationButton({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    setError(null);
    const result = await acceptTeamInvitationAction({ token });
    if (result.ok) {
      window.location.href = result.data.destination;
      return;
    }
    setError(result.error);
    setPending(false);
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700" role="alert" data-testid="team-invitation-error">{error}</p>}
      <button type="button" onClick={accept} disabled={pending} className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50" data-testid="team-invitation-accept">
        {pending ? 'Rattachement…' : 'Rejoindre l’équipe'}
      </button>
    </div>
  );
}
