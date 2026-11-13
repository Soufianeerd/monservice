'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  getClientPortalStatusAction,
  inviteClientToPortalAction,
  revokeClientPortalInvitationAction,
  unlinkClientPortalAccountAction,
} from '@/app/actions/client-portal-invitation.actions';
import type { ClientPortalStatus } from '@/lib/services/client-portal-invitation.service';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(iso));
}

export default function ClientPortalAccessPanel({ clientId, defaultEmail }: { clientId: string; defaultEmail: string | null }) {
  const [status, setStatus] = useState<ClientPortalStatus | null>(null);
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await getClientPortalStatusAction({ clientId });
    if (result.ok) setStatus(result.data);
    else toast.error(result.error);
  }, [clientId]);

  useEffect(() => {
    let cancelled = false;
    getClientPortalStatusAction({ clientId }).then((result) => {
      if (cancelled) return;
      if (result.ok) setStatus(result.data);
      else toast.error(result.error);
    });
    return () => { cancelled = true; };
  }, [clientId]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await inviteClientToPortalAction({ clientId, email: email.trim() || undefined });
      if (!result.ok) { toast.error(result.error); return; }
      setLink(result.data.url);
      toast.success(result.data.emailSent ? `Invitation envoyée à ${result.data.email}` : 'Invitation créée : copiez le lien pour l’envoyer au client');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    try {
      const result = await revokeClientPortalInvitationAction({ clientId });
      if (!result.ok) { toast.error(result.error); return; }
      setLink(null);
      toast.success('Invitation retirée');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    if (!window.confirm('Retirer l’accès de ce client à son espace ? Il ne verra plus ses devis, factures ni interventions.')) return;
    setBusy(true);
    try {
      const result = await unlinkClientPortalAccountAction({ clientId });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success('Accès retiré');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Lien copié');
    } catch {
      toast.error('Copie impossible : sélectionnez le lien manuellement');
    }
  }

  return (
    <section className="bg-white shadow sm:rounded-lg" data-testid="client-portal-access">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Espace client</h3>
        <p className="mt-1 text-sm text-gray-500">Le client suit ses devis, factures et interventions depuis son propre compte.</p>
      </div>
      <div className="px-4 py-5 sm:px-6 space-y-4 text-sm">
        {!status && <p className="text-gray-500 animate-pulse">Chargement…</p>}

        {status?.linked && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-gray-900" data-testid="client-portal-linked">
              <span className="inline-block rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-semibold mr-2">Accès actif</span>
              {status.linkedEmail ? `Compte ${status.linkedEmail}` : 'Compte client relié'}
            </p>
            <button type="button" onClick={unlink} disabled={busy} className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
              Retirer l’accès
            </button>
          </div>
        )}

        {status && !status.linked && status.pending && (
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="client-portal-pending">
            <p className="text-gray-900">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold mr-2 ${status.pending.expired ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-800'}`}>
                {status.pending.expired ? 'Invitation expirée' : 'Invitation en attente'}
              </span>
              {status.pending.email} · {status.pending.expired ? 'expirée le' : 'valable jusqu’au'} {formatDate(status.pending.expiresAt)}
            </p>
            <button type="button" onClick={revoke} disabled={busy} className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50">
              Retirer l’invitation
            </button>
          </div>
        )}

        {status && !status.linked && (
          <form onSubmit={invite} className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <label className="flex-1">
              <span className="block text-xs font-medium text-gray-600 mb-1">E-mail du client</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="client@exemple.fr"
                data-testid="client-portal-email"
              />
            </label>
            <button type="submit" disabled={busy} className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50" data-testid="client-portal-invite">
              {busy ? 'Envoi…' : status.pending ? 'Renvoyer une invitation' : 'Inviter à son espace'}
            </button>
          </form>
        )}

        {link && (
          <div className="rounded-md bg-gray-50 border border-gray-200 p-3 space-y-2">
            <p className="text-xs text-gray-600">Lien à usage unique, à transmettre uniquement à ce client :</p>
            <div className="flex gap-2">
              <input readOnly value={link} className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs font-mono" data-testid="client-portal-link" onFocus={(e) => e.currentTarget.select()} />
              <button type="button" onClick={copyLink} className="rounded border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-white">Copier</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
