'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DealForm from '@/components/crm/DealForm';
import { activityLogRepository } from '@/lib/data';
import { dealService } from '@/lib/services/deal.service';
import { clientService } from '@/lib/services/client.service';
import { useAuth } from '@/components/auth/AuthContext';
import { Deal, Client } from '@/lib/data/interfaces';

export default function NewDealPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.organizationId) {
      clientService.findAll(user.organizationId).then(setClients);
    }
  }, [user]);

  const handleSubmit = async (data: Partial<Deal>) => {
    if (!user?.organizationId) return;
    setIsSubmitting(true);
    try {
      const newDeal = await dealService.create({
        name: data.name || 'Nouveau Deal',
        value: data.value || 0,
        status: data.status || 'prospect',
        expectedCloseDate: data.expectedCloseDate || new Date().toISOString(),
        clientId: data.clientId || '',
        organizationId: user.organizationId,
        description: data.description || '',
      });

      await activityLogRepository.create({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'CREATE',
        entityType: 'DEAL',
        entityId: newDeal.id,
        details: `Création du deal ${data.name}`,
        createdAt: new Date().toISOString(),
      });

      alert('Opportunité créée !');
      router.push('/deals');
    } catch (error) {
      console.error('Erreur', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau deal</h1>
        <p className="mt-1 text-sm text-gray-500">Créez une nouvelle opportunité commerciale.</p>
      </div>
      <DealForm clients={clients} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
