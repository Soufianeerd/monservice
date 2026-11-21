'use client';

import { useState } from 'react';
import { verifySecondFactorAction } from '@/app/actions/two-factor.actions';
import { authClient } from '@/lib/auth/client';
import { authButtonClass, authInputClass, authLabelClass, authMessageClass } from '@/components/auth/auth-styles';

export default function SecondFactorForm({ destination }: { destination: string }) {
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await verifySecondFactorAction(code);
      if (result.ok) {
        window.location.href = destination;
        return;
      }
      setError(result.error);
    } catch {
      setError('Vérification indisponible. Réessayez.');
    } finally {
      setPending(false);
    }
  };

  const signOut = async () => {
    await authClient.signOut();
    window.location.href = '/login';
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="second-factor-code" className={authLabelClass}>
          {useRecovery ? 'Code de secours' : 'Code de vérification'}
        </label>
        <input
          id="second-factor-code"
          required
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className={`${authInputClass} ${useRecovery ? '' : 'tracking-[0.4em]'}`}
          {...(useRecovery
            ? { autoComplete: 'off', placeholder: 'xxxxx-xxxxx' }
            : { inputMode: 'numeric' as const, autoComplete: 'one-time-code', pattern: '[0-9 ]{6,7}', maxLength: 7, placeholder: '123456' })}
        />
      </div>
      {error && <div role="alert" className={authMessageClass('error')}>{error}</div>}
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? 'Vérification…' : 'Vérifier'}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => { setUseRecovery(!useRecovery); setCode(''); setError(null); }}
          className="font-semibold text-primary-600 hover:underline"
        >
          {useRecovery ? 'Utiliser l’application' : 'Utiliser un code de secours'}
        </button>
        <button type="button" onClick={signOut} className="text-gray-600 hover:underline">
          Se déconnecter
        </button>
      </div>
    </form>
  );
}
