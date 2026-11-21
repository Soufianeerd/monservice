'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { isAuthApiError } from '@neondatabase/auth/next';
import PasswordField from '@/components/auth/PasswordField';
import { passwordSchema } from '@/lib/validation/schemas';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ text: 'Les mots de passe ne correspondent pas.', type: 'error' });
      return;
    }
    const policy = passwordSchema.safeParse(password);
    if (!policy.success) {
      setMessage({ text: policy.error.issues[0]?.message ?? 'Mot de passe non conforme.', type: 'error' });
      return;
    }

    setLoading(true);
    const token = searchParams.get('token');
    if (!token) { setLoading(false); setMessage({ text: 'Lien invalide ou expiré.', type: 'error' }); return; }
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token });

      if (error) {
        setMessage({ text: 'Erreur lors de la mise à jour.', type: 'error' });
      } else {
        setMessage({ text: 'Mot de passe mis à jour avec succès.', type: 'success' });
        setTimeout(() => router.push('/login'), 2000);
      }
    } catch (error) {
      // Neon normalizes INVALID_TOKEN to bad_jwt (401), even when the
      // upstream reset endpoint answered 400. It remains a rejected link.
      setMessage({ text: isAuthApiError(error) && (error.status === 400 || error.code === 'bad_jwt') ? 'Erreur lors de la mise à jour.' : 'Mise à jour indisponible. Réessayez.', type: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <h1 className="text-xl font-bold mb-4">Créer un nouveau mot de passe</h1>
      <form onSubmit={handleSubmit}>
        <PasswordField
          id="reset-password"
          label="Nouveau mot de passe"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showRequirements
          required
          className="mb-4"
        />
        <PasswordField
          id="reset-password-confirm"
          label="Confirmer le mot de passe"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={confirmPassword && confirmPassword !== password ? 'Les deux mots de passe ne correspondent pas.' : undefined}
          required
          className="mb-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          {loading ? 'Mise à jour...' : 'Réinitialiser'}
        </button>
      </form>
      {message && (
        <div className={`mt-4 p-2 text-sm rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
