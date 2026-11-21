'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ShieldCheck, ShieldAlert, Copy, Download } from 'lucide-react';
import {
  confirmTwoFactorEnrollmentAction,
  disableTwoFactorAction,
  startTwoFactorEnrollmentAction,
} from '@/app/actions/two-factor.actions';

type Step =
  | { kind: 'idle' }
  | { kind: 'scan'; secret: string; uri: string; qrCode: string }
  | { kind: 'codes'; recoveryCodes: string[] }
  | { kind: 'disable' };

const inputClass = 'mt-1 block w-48 rounded-md border border-gray-300 px-3 py-2 text-lg tracking-[0.3em] text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
const primary = 'inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50';
const secondary = 'inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50';

export default function TwoFactorSettings({ initiallyEnabled, available }: { initiallyEnabled: boolean; available: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const enrollment = await startTwoFactorEnrollmentAction();
      setStep({ kind: 'scan', ...enrollment });
      setCode('');
    } catch {
      setError('Impossible de démarrer la configuration. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await confirmTwoFactorEnrollmentAction(code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEnabled(true);
      setStep({ kind: 'codes', recoveryCodes: result.recoveryCodes });
      toast.success('Double authentification activée');
    } catch {
      setError('Activation indisponible. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await disableTwoFactorAction(code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEnabled(false);
      setStep({ kind: 'idle' });
      setCode('');
      toast.success('Double authentification désactivée');
    } catch {
      setError('Désactivation indisponible. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const codesText = step.kind === 'codes' ? step.recoveryCodes.join('\n') : '';

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" data-testid="two-factor-settings">
      <div className="flex items-start gap-3">
        {enabled ? <ShieldCheck className="h-6 w-6 shrink-0 text-green-600" aria-hidden /> : <ShieldAlert className="h-6 w-6 shrink-0 text-amber-500" aria-hidden />}
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">Double authentification</h2>
          <p className="mt-1 text-sm text-gray-600" data-testid="two-factor-status">
            {enabled
              ? 'Active : à chaque connexion, un code de votre application d’authentification est demandé après le mot de passe.'
              : 'Inactive : votre mot de passe suffit pour se connecter. Activez-la avec une application comme Google Authenticator, Microsoft Authenticator ou 1Password.'}
          </p>
        </div>
      </div>

      {!available && (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">La double authentification n’est pas encore configurée sur ce serveur.</p>
      )}

      {available && step.kind === 'idle' && (
        <div className="mt-5">
          {enabled ? (
            <button type="button" className={secondary} onClick={() => { setStep({ kind: 'disable' }); setCode(''); setError(null); }}>
              Désactiver
            </button>
          ) : (
            <button type="button" className={primary} onClick={start} disabled={busy}>
              {busy ? 'Préparation…' : 'Activer la double authentification'}
            </button>
          )}
        </div>
      )}

      {step.kind === 'scan' && (
        <form onSubmit={confirm} className="mt-6 space-y-5">
          <ol className="list-decimal space-y-4 pl-5 text-sm text-gray-700">
            <li>
              Scannez ce QR code avec votre application d’authentification.
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={step.qrCode} alt="QR code de configuration de la double authentification" width={180} height={180} className="mt-3 rounded border border-gray-200" />
              <p className="mt-2 text-xs text-gray-500">
                Impossible de scanner ? Saisissez cette clé :{' '}
                <code className="select-all break-all rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-800" data-testid="two-factor-secret">{step.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
                {' '}ou <a href={step.uri} className="font-medium text-indigo-600 underline">ouvrez l’application sur ce téléphone</a>.
              </p>
            </li>
            <li>
              <label htmlFor="two-factor-setup-code">Saisissez le code à 6 chiffres affiché :</label>
              <input id="two-factor-setup-code" required inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(event) => setCode(event.target.value)} className={inputClass} />
            </li>
          </ol>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" className={primary} disabled={busy}>{busy ? 'Vérification…' : 'Activer'}</button>
            <button type="button" className={secondary} onClick={() => setStep({ kind: 'idle' })}>Annuler</button>
          </div>
        </form>
      )}

      {step.kind === 'codes' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Gardez ces <strong>codes de secours</strong> en lieu sûr : chacun permet de vous connecter une fois si vous perdez votre téléphone.
            Ils ne seront plus affichés.
          </div>
          <ul className="grid grid-cols-2 gap-2 rounded-md border border-gray-200 bg-gray-50 p-4 font-mono text-sm text-gray-900 sm:grid-cols-3" data-testid="recovery-codes">
            {step.recoveryCodes.map((recoveryCode) => <li key={recoveryCode}>{recoveryCode}</li>)}
          </ul>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={secondary} onClick={async () => { await navigator.clipboard.writeText(codesText); toast.success('Codes copiés'); }}>
              <Copy className="mr-2 h-4 w-4" aria-hidden /> Copier
            </button>
            <a className={secondary} download="monservice-codes-de-secours.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(codesText)}`}>
              <Download className="mr-2 h-4 w-4" aria-hidden /> Télécharger
            </a>
            <button type="button" className={primary} onClick={() => setStep({ kind: 'idle' })}>J’ai enregistré mes codes</button>
          </div>
        </div>
      )}

      {step.kind === 'disable' && (
        <form onSubmit={disable} className="mt-6 space-y-4">
          <label htmlFor="two-factor-disable-code" className="block text-sm text-gray-700">
            Pour désactiver, saisissez un code de votre application (ou un code de secours) :
          </label>
          <input id="two-factor-disable-code" required autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} className={inputClass} />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" disabled={busy}>
              {busy ? 'Vérification…' : 'Désactiver'}
            </button>
            <button type="button" className={secondary} onClick={() => setStep({ kind: 'idle' })}>Annuler</button>
          </div>
        </form>
      )}
      {error && step.kind === 'idle' && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
