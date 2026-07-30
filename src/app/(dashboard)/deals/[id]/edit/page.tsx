'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DealForm from '@/components/crm/DealForm';
import { activityLogRepository } from '@/lib/data';
import { dealService } from '@/lib/services/deal.service';
import { clientService } from '@/lib/services/client.service';
import { useAuth } from '@/components/auth/AuthContext';
import { Deal, Client } from '@/lib/data/interfaces';

export default function EditDealPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.organizationId) return;
      try {
        const [dealData, clientsData] = await Promise.all([
          dealService.findById(params.id as string, user.organizationId),
          clientService.findAll(user.organizationId)
        ]);

        if (dealData) {
          setDeal(dealData);
          setClients(clientsData);
        } else {
          router.push('/deals');
        }
      } catch (error) {
        console.error('Erreur', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (user) loadData();
  }, [params.id, user, router]);

  const handleSubmit = async (data: Partial<Deal>) => {
    if (!user?.organizationId) return;
    setIsSubmitting(true);
    const id = params.id as string;
    try {
      await dealService.update(id, user.organizationId, {
        ...data,
      });

      await activityLogRepository.create({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'DEAL',
        entityId: id,
        details: `Mise à jour du deal ${data.name}`,
        createdAt: new Date().toISOString(),
      });

      router.push('/deals');
    } catch (error) {
      console.error('Erreur lors de la modification', error);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Chargement...</div>;
  if (!deal) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le deal</h1>
      </div>
      <DealForm initialData={deal} clients={clients} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
