'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardBody } from '@/components/ui/Card';
import { Invoice } from '@/lib/data/interfaces';
import { invoiceRepository } from '@/lib/data/repositories';
import { useEffect, useState } from 'react';
import QuoteList from '@/components/client/QuoteList';

export default function ClientQuotesPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Invoice[]>([]);

  useEffect(() => {
    if (user?.id) {
      invoiceRepository.findByClient(user.id).then(invoices => {
        setQuotes(invoices.filter(i => i.type === 'quote').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      });
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes devis</h1>
        <p className="text-gray-500">Consultez et gérez les devis envoyés par les professionnels.</p>
      </div>

      <Card>
        <CardBody>
          <QuoteList quotes={quotes} />
        </CardBody>
      </Card>
    </div>
  );
}
