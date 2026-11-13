'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { isAuthApiError } from '@neondatabase/auth/next';

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
  return <div className="max-w-md mx-auto p-6 space-y-4"><h1 className="text-xl font-bold">Confirmer votre adresse email</h1>
    <p>Cette confirmation protège l’accès à votre compte et à vos données.</p>
    <form onSubmit={verify} className="space-y-4">
      <label className="block">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="block w-full border p-2 rounded" /></label>
      <button type="button" disabled={pending || !email} onClick={send} className="text-primary-700 underline">Envoyer un code</button>
      <label className="block">Code reçu<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={otp} onChange={e=>setOtp(e.target.value)} className="block w-full border p-2 rounded" /></label>
      <button disabled={pending} className="bg-primary-600 text-white rounded p-2">Confirmer</button>
    </form><p role="status">{message}</p></div>;
}
export default function VerifyEmailPage() { return <Suspense fallback={<p>Chargement…</p>}><VerificationForm /></Suspense>; }
