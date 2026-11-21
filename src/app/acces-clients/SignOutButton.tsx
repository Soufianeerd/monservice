'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth/client';

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await authClient.signOut();
        } finally {
          window.location.href = '/login';
        }
      }}
      className="rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
    >
      Se déconnecter
    </button>
  );
}
