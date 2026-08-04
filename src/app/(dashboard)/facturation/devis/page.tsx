'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { useEffect, useState } from 'react';
import { Invoice } from '@/lib/data/interfaces';
import * as invoiceActions from '@/app/actions/invoice.actions';
import QuotesSentList from '@/components/marketplace/QuotesSentList';

export default function QuotesSentPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Invoice[]>([]);

  useEffect(() => {
    if (user?.organizationId) {
      invoiceActions.findByProfessionalAction(user.organizationId).then(invs => {
        // Only keep quotes
        setQuotes(invs.filter(i => i.type === 'quote').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      });
    }
  }, [user]);

  return (
    <div className="space-y-6">

      <QuotesSentList quotes={quotes} />
    </div>
  );
}
