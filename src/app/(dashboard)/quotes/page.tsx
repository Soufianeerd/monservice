'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { useEffect, useState } from 'react';
import { Invoice } from '@/lib/data/interfaces';
import { invoiceRepository } from '@/lib/data/repositories';
import QuotesSentList from '@/components/marketplace/QuotesSentList';

export default function QuotesSentPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Invoice[]>([]);

  useEffect(() => {
    if (user?.organizationId) {
      invoiceRepository.findByProfessional(user.organizationId).then(invs => {
        // Only keep quotes
        setQuotes(invs.filter(i => i.type === 'quote').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      });
    }
  }, [user]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes devis envoyés</h1>
        <p className="text-gray-500">Suivez l'état des devis que vous avez envoyés en réponse aux demandes des clients.</p>
      </div>

      <QuotesSentList quotes={quotes} />
    </div>
  );
}
