'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Invoice } from '@/lib/data/interfaces';
import { invoiceService } from '@/lib/services/invoice.service';
import SignaturePad from '@/components/crm/SignaturePad';

export default function QuoteSignPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [quote, setQuote] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const q = await invoiceService.getById(id);
        if (q && q.type === 'quote') {
          setQuote(q);
        } else {
          setError('Devis introuvable.');
        }
      } catch (err) {
        setError('Erreur lors du chargement du devis.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [id]);

  const handleSaveSignature = async (signatureData: string) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/quotes/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: id, signature: signatureData }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la signature');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Chargement...</div>;

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-6">{error || 'Une erreur est survenue'}</p>
        </div>
      </div>
    );
  }

  if (success || quote.status === 'paid' || quote.signature) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-green-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Devis signé !</h2>
          <p className="text-gray-600 mb-6">Merci pour votre confiance. Le professionnel a été notifié.</p>
          <button onClick={() => router.push('/client/dashboard')} className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">
            Retour à l'espace client
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Signature du devis</h1>
            <p className="text-gray-500 mt-2">Devis N° {quote.number} d'un montant de {quote.totalTTC} € TTC</p>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">En signant ce devis, vous acceptez :</h3>
            <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
              <li>Le montant total de {quote.totalTTC} € TTC</li>
              <li>Les conditions générales de vente du prestataire</li>
              <li>Le démarrage des travaux / prestations selon les délais convenus</li>
            </ul>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Votre signature</label>
            <SignaturePad onSave={handleSaveSignature} />
            {saving && <p className="text-sm text-blue-600 text-center">Enregistrement en cours...</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
