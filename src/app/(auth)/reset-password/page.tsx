'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

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
    if (password.length < 12) {
      setMessage({ text: 'Le mot de passe doit faire au moins 12 caractères.', type: 'error' });
      return;
    }

    setLoading(true);
    const token = searchParams.get('token');
    if (!token) { setLoading(false); setMessage({ text: 'Lien invalide ou expiré.', type: 'error' }); return; }
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);

    if (error) {
      setMessage({ text: 'Erreur lors de la mise à jour.', type: 'error' });
    } else {
      setMessage({ text: 'Mot de passe mis à jour avec succès.', type: 'success' });
      setTimeout(() => router.push('/login'), 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <h1 className="text-xl font-bold mb-4">Créer un nouveau mot de passe</h1>
      <form onSubmit={handleSubmit}>
        <label className="block mb-2">Nouveau mot de passe (12 caractères min)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded mb-4"
          required
        />
        <label className="block mb-2">Confirmer le mot de passe</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border p-2 rounded mb-4"
          required
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
