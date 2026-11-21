'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { isAuthApiError } from '@neondatabase/auth/next';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import { authButtonClass, authInputClass, authLabelClass } from '@/components/auth/auth-styles';

function VerificationForm() {
  const params = useSearchParams();
  const [email,setEmail] = useState(params.get('email') ?? '');
  const [otp,setOtp] = useState('');
  const [pending,setPending] = useState(false);
  const [message,setMessage] = useState('');
  const send = async () => {
    setPending(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim().toLowerCase(), type: 'email-verification' });
      setMessage(error ? 'Envoi indisponible. Réessayez dans quelques instants.' : 'Si ce compte existe, un code a été envoyé.');
    } catch { setMessage('Envoi indisponible. Réessayez dans quelques instants.'); }
    finally { setPending(false); }
  };
  const verify = async (event: React.FormEvent) => {
    event.preventDefault(); setPending(true);
    try {
      const { error } = await authClient.emailOtp.verifyEmail({ email: email.trim().toLowerCase(), otp });
      if (error) setMessage('Code invalide ou expiré.');
      else window.location.href = '/login';
    } catch (error) {
      setMessage(isAuthApiError(error) && error.status === 400 ? 'Code invalide ou expiré.' : 'Vérification indisponible. Réessayez.');
    }
    finally { setPending(false); }
  };
  return (
    <AuthLayout
      title="Confirmer votre adresse email"
      subtitle="Cette confirmation protège l’accès à votre compte et à vos données."
    >
      <form onSubmit={verify} className="space-y-5">
        <div>
          <label htmlFor="verify-email" className={authLabelClass}>Adresse email</label>
          <input id="verify-email" required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={authInputClass} />
        </div>
        <button type="button" disabled={pending || !email} onClick={send} className="text-sm font-semibold text-primary-600 hover:underline disabled:opacity-50">
          Envoyer un code
        </button>
        <div>
          <label htmlFor="verify-otp" className={authLabelClass}>Code reçu</label>
          <input id="verify-otp" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="6 chiffres" value={otp} onChange={e => setOtp(e.target.value)} className={`${authInputClass} tracking-[0.4em]`} />
        </div>
        <button disabled={pending} className={authButtonClass}>Confirmer</button>
      </form>
      <p role="status" className="mt-5 text-sm text-gray-700">{message}</p>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-primary-600 hover:underline">Retour à la connexion</Link>
      </p>
    </AuthLayout>
  );
}
export default function VerifyEmailPage() { return <Suspense fallback={<p>Chargement…</p>}><VerificationForm /></Suspense>; }
