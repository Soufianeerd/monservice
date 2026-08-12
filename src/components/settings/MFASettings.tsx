'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export function MFASettings({ user }: { user: { mfaEnabled: boolean } }) {
  const [mfaEnabled, setMfaEnabled] = useState(user.mfaEnabled);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');

  const activateMFA = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSecret(data.secret);
        setQrCode(data.qrCode);
      } else {
        toast.error('Failed to initiate MFA');
      }
    } catch (e) {
      toast.error('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (code.length !== 6) {
      toast.error('Code must be 6 digits');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        setMfaEnabled(true);
        setQrCode(null);
        setSecret(null);
        setCode('');
        toast.success('MFA successfully enabled');
      } else {
        toast.error('Invalid code');
      }
    } catch (e) {
      toast.error('Error verifying code');
    } finally {
      setLoading(false);
    }
  };

  const disableMFA = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa', { method: 'DELETE' });
      if (res.ok) {
        setMfaEnabled(false);
        toast.success('MFA disabled');
      } else {
        toast.error('Failed to disable MFA');
      }
    } catch (e) {
      toast.error('Error disabling MFA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg border border-gray-200 p-6 max-w-lg">
      <h2 className="text-lg font-medium mb-4">Authentification à deux facteurs (2FA)</h2>
      
      {mfaEnabled ? (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">L'authentification à deux facteurs est activée</span>
          </div>
          <button
            onClick={disableMFA}
            disabled={loading}
            className="self-start text-sm bg-red-50 text-red-600 px-4 py-2 rounded-md hover:bg-red-100 disabled:opacity-50 border border-red-200"
          >
            {loading ? 'Désactivation...' : 'Désactiver la MFA'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Protégez votre compte en ajoutant une couche de sécurité supplémentaire. Une fois activée, vous devrez saisir un code généré par votre application d'authentification (ex: Google Authenticator) lors de la connexion.
          </p>
          
          {!qrCode ? (
            <button
              onClick={activateMFA}
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'Génération...' : 'Configurer l\'authentification'}
            </button>
          ) : (
            <div className="space-y-6 mt-6 border-t pt-4">
              <div>
                <p className="text-sm font-medium mb-2">1. Scannez ce QR Code avec votre application :</p>
                <div className="bg-white p-2 inline-block border rounded-lg">
                  <img src={qrCode} alt="QR Code MFA" className="w-48 h-48" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Code secret manuel : <code className="bg-gray-100 px-1 rounded">{secret}</code>
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">2. Entrez le code à 6 chiffres :</p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-center tracking-widest font-mono"
                  />
                  <button
                    onClick={verifyAndEnable}
                    disabled={loading || code.length !== 6}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                  >
                    Vérifier
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
