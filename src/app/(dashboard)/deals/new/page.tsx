'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DealForm from '@/components/crm/DealForm';
import { dealRepository, clientRepository, activityLogRepository } from '@/lib/data';
import { generateId } from '@/lib/utils/id-generator';
import { Client, Deal } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';

export default function NewDealPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.organizationId) {
      clientRepository.findByOrganization(user.organizationId).then(setClients);
    }
  }, [user?.organizationId]);

  const handleSubmit = async (data: Partial<Deal>) => {
    if (!user?.organizationId) return;
    setIsSubmitting(true);
    try {
      const newDeal = await dealRepository.create({
        name: data.name || '',
        value: data.value || 0,
        stage: data.stage || 'Prospect',
        clientId: data.clientId || '',
        expectedCloseDate: data.expectedCloseDate || '',
        organizationId: user.organizationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await activityLogRepository.create({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'CREATE',
        entityType: 'DEAL',
        entityId: newDeal.id,
        details: `Création de l'opportunité ${data.name}`,
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
