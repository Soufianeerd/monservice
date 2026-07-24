'use client';

import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

interface StripePaymentButtonProps {
  invoiceId: string;
  organizationId: string;
  disabled?: boolean;
}

export default function StripePaymentButton({ invoiceId, organizationId, disabled }: StripePaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stripe/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId, organizationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du paiement');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handlePayment}
        disabled={loading || disabled}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        {loading ? 'Redirection...' : 'Payer en ligne'}
      </button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}
