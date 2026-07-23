'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DealForm, { DealFormData } from '@/components/crm/DealForm';
import { dealRepository, clientRepository, activityLogRepository } from '@/lib/data';
import { generateId } from '@/lib/utils/id-generator';
import { Deal, Client } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';

export default function EditDealPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.organizationId) return;
      const [d, clientsData] = await Promise.all([
        dealRepository.getById(params.id as string),
        clientRepository.findByOrganization(user.organizationId)
      ]);
      
      if (d && d.organizationId === user.organizationId) {
        setDeal(d);
        setClients(clientsData);
      } else {
        router.push('/deals');
      }
      setLoading(false);
    }
    load();
  }, [params.id, user, router]);

  const handleSubmit = async (data: DealFormData) => {
    setIsSubmitting(true);
    const id = params?.id as string;
    if (!id) return;
    try {
      await dealRepository.update(id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });

      if (user) {
        await activityLogRepository.create({
          organizationId: user.organizationId || '',
          userId: user.id,
          action: 'UPDATE',
          entityType: 'DEAL',
          entityId: id,
          details: `Mise à jour de l'opportunité ${data.name}`,
          createdAt: new Date().toISOString(),
        });
      }

      router.push('/deals');
    } catch (error) {
      console.error('Erreur', error);
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
