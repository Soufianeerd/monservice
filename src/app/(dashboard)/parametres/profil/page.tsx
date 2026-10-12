'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { authClient } from '@/lib/auth/client';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  if (!user) return null;

  async function save(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError(''); setNotice('');
    try {
      await updateUser({ name: (name ?? user!.name ?? '').trim() });
      setNotice('Votre nom a été enregistré.');
    } catch { setError('Votre profil n’a pas pu être enregistré. Réessayez.'); }
    finally { setPending(false); }
  }

  async function requestReset() {
    setSending(true); setError(''); setResetSent(false);
    try {
      // L'adresse d'identité vient du fournisseur, jamais du profil métier modifiable.
      const session = await authClient.getSession();
      const email = session.data?.user.email;
      if (!email) throw new Error('Session expirée');
      const result = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` });
      if (result.error) throw result.error;
      setResetSent(true);
    } catch { setError('Le lien n’a pas pu être envoyé. Réessayez ou reconnectez-vous.'); }
    finally { setSending(false); }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div><h2 className="text-xl font-semibold text-gray-900">Mon compte</h2><p className="mt-2 text-sm text-gray-500">Vos informations personnelles de connexion. Les coordonnées professionnelles se règlent séparément.</p></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{notice}</p>}
      <form onSubmit={save} data-tour="profile-form" className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom complet</label><input id="name" required maxLength={120} value={name ?? user.name ?? ''} onChange={e => setName(e.target.value)} className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2" /></div>
        <div><label htmlFor="email" className="block text-sm font-medium text-gray-700">Adresse e-mail de connexion</label><input id="email" type="email" readOnly value={user.email || ''} className="mt-2 block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2" /><p className="mt-2 text-xs text-gray-500">Cette adresse identifie votre compte et reçoit les messages de sécurité.</p></div>
        <button disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? 'Enregistrement…' : 'Enregistrer mon nom'}</button>
      </form>
      <section data-tour="password-security" className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="password-title">
        <h2 id="password-title" className="text-lg font-semibold text-gray-900">Changer mon mot de passe</h2>
        <p className="text-sm text-gray-600">Pour confirmer que vous êtes bien titulaire du compte, ouvrez le lien sécurisé reçu par e-mail. Vous pourrez ensuite choisir et confirmer votre nouveau mot de passe.</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600"><li>Demandez le lien de confirmation.</li><li>Ouvrez-le dans votre boîte e-mail.</li><li>Choisissez un nouveau mot de passe d’au moins 12 caractères.</li></ol>
        {resetSent && <p role="status" className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">La demande a été prise en compte. Consultez votre boîte e-mail et vos indésirables. Le changement prendra effet seulement après validation du lien et du nouveau mot de passe.</p>}
        <button type="button" onClick={requestReset} disabled={sending} className="rounded-lg border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 disabled:opacity-50">{sending ? 'Envoi en cours…' : resetSent ? 'Renvoyer le lien sécurisé' : 'Recevoir le lien sécurisé'}</button>
      </section>
    </div>
  );
}
