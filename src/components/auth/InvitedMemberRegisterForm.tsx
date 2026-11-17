'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { registerInvitedMemberAction } from '@/app/actions/team.actions';
import { useAuth } from './AuthContext';
import PasswordField from './PasswordField';

const inputClass =
  'block w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm transition-colors';

/**
 * Inscription d'un collaborateur invité : pas de choix de profil ni
 * d'entreprise, le compte rejoint l'équipe qui l'a invité après vérification
 * de son adresse.
 */
export default function InvitedMemberRegisterForm({ token, email, organizationName }: { token: string; email: string; organizationName: string }) {
  const router = useRouter();
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    const result = await registerInvitedMemberAction({ token, name, email, password });
    if (!result.ok) {
      setSubmitting(false);
      toast.error(result.error);
      return;
    }
    if (result.data.requiresEmailConfirmation) {
      toast.success('Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse.');
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      return;
    }
    const { error } = await signIn(email, password);
    setSubmitting(false);
    // Sans organisation, la finalisation propose de rejoindre l'équipe.
    router.push(error ? '/login' : '/complete-profile');
  }

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="invited-member-register">
      <p className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-900">
        Vous rejoignez l’équipe de <strong>{organizationName}</strong>.
      </p>
      <div>
        <label htmlFor="invited-name" className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
        <input id="invited-name" type="text" name="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Jean Dupont" />
      </div>
      <div>
        <label htmlFor="invited-email" className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
        <input id="invited-email" type="email" name="email" value={email} readOnly className={`${inputClass} bg-gray-50 text-gray-600`} />
        <p className="mt-1 text-xs text-gray-500">L’invitation est liée à cette adresse.</p>
      </div>
      <PasswordField
        id="invited-password"
        label="Mot de passe *"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="8 caractères min, 1 maj, 1 min, 1 chiffre, 1 spécial"
        helperText="Min. 8 caractères dont 1 majuscule, 1 minuscule, 1 chiffre et 1 symbole."
      />
      <PasswordField
        id="invited-confirm-password"
        label="Confirmer le mot de passe *"
        name="confirmPassword"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirmez votre mot de passe"
      />
      <button type="submit" disabled={submitting} className="w-full rounded-xl bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
        {submitting ? 'Création…' : 'Créer mon compte'}
      </button>
    </form>
  );
}
