'use client';

import { useState } from 'react';
import { Request } from '@/lib/data/interfaces';

export default function RespondToRequestForm({ request, onSubmit, loading }: { request: Request, onSubmit: (data: { amount: number, message: string }) => void, loading: boolean }) {
  const [amount, setAmount] = useState<number | ''>('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === '' || Number.isNaN(amount)) return;
    onSubmit({ amount: Number(amount), message });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Montant de la prestation (HT en €) *</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="number"
            required
            min="0"
            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md py-2 border"
            placeholder="Ex: 500"
            value={amount}
            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">€</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Message au client</label>
        <div className="mt-1">
          <textarea
            rows={5}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-3"
            placeholder="Décrivez votre proposition, votre approche..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Ce message accompagnera votre devis et sera visible par le client dans sa messagerie.
        </p>
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button
          type="submit"
          disabled={loading || amount === ''}
          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Envoi en cours...' : 'Envoyer le devis'}
        </button>
      </div>
    </form>
  );
}
