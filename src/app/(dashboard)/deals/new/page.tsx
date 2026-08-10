'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DealForm from '@/components/crm/DealForm';
import * as dealActions from '@/app/actions/deal.actions';
import * as clientActions from '@/app/actions/client.actions';
import { useAuth } from '@/components/auth/AuthContext';
import { Deal, Client } from '@/lib/data/interfaces';
import { handleError } from '@/lib/utils/error-handler';

export default function NewDealPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Partial<Deal>) => {
    if (!user?.organizationId) return;
    setIsSubmitting(true);
    try {
      const newDeal = await dealActions.createAction({
        name: data.name || 'Nouveau Deal',
        value: data.value || 0,
        status: data.status || 'prospect',
        expectedCloseDate: data.expectedCloseDate || new Date().toISOString(),
        clientId: data.clientId || '',
        organizationId: user.organizationId,
        description: data.description || '',
      }, user.id);

      // activityLog disabled

      alert('Opportunité créée !');
      router.push(`/deals/${newDeal.id}`);
    } catch (error) {
      handleError(error, "Erreur lors de la création de l'opportunité");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau deal</h1>
        <p className="mt-1 text-sm text-gray-500">Créez une nouvelle opportunité commerciale.</p>
      </div>
      <DealForm organizationId={user?.organizationId || ''} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
