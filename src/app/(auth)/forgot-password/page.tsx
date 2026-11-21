'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import AuthLayout from '@/components/auth/AuthLayout';
import { authButtonClass, authInputClass, authLabelClass, authMessageClass } from '@/components/auth/auth-styles';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      const { error } = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setMessage({ text: 'Envoi indisponible. Réessayez dans quelques instants.', type: 'error' });
      } else {
        setMessage({ text: 'Si ce compte existe, un email de réinitialisation a été envoyé.', type: 'success' });
      }
    } catch {
      setMessage({ text: 'Envoi indisponible. Réessayez dans quelques instants.', type: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Indiquez l’adresse de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="forgot-email" className={authLabelClass}>Adresse email</label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            placeholder="vous@exemple.fr"
            required
          />
        </div>
        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Envoi…' : 'Envoyer le lien'}
        </button>
      </form>
      {message && (
        <div role="status" className={`mt-5 ${authMessageClass(message.type)}`}>
          {message.text}
        </div>
      )}
      <p className="mt-8 text-center text-sm">
        <Link href="/login" className="font-semibold text-primary-600 hover:underline">Retour à la connexion</Link>
      </p>
    </AuthLayout>
  );
}
