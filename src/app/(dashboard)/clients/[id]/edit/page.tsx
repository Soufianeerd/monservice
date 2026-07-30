'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClientForm from '@/components/crm/ClientForm';
import { activityLogRepository } from '@/lib/data';
import { clientService } from '@/lib/services/client.service';
import { useAuth } from '@/components/auth/AuthContext';
import { Client } from '@/lib/data/interfaces';

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.organizationId) return;
      const data = await clientService.findById(params.id as string, user.organizationId);
      if (data) {
        setClient(data);
      } else {
        router.push('/clients');
      }
      setLoading(false);
    }
    if (user) load();
  }, [params.id, user, router]);

  const handleSubmit = async (data: Partial<Client>) => {
    if (!user?.organizationId) return;
    setIsSubmitting(true);
    const id = params.id as string;
    try {
      await clientService.update(id, user.organizationId, {
        ...data,
      });

      if (user) {
        await activityLogRepository.create({
          organizationId: user.organizationId || '',
          userId: user.id,
          action: 'UPDATE',
          entityType: 'CLIENT',
          entityId: id as string,
          details: `Mise à jour du client ${data.name}`,
          createdAt: new Date().toISOString(),
        });
      }

      router.push('/clients');
    } catch (error) {
      console.error('Erreur lors de la modification', error);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Chargement...</div>;
  if (!client) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le client</h1>
        <p className="mt-1 text-sm text-gray-500">Modifiez les informations du client.</p>
      </div>
      <ClientForm initialData={client} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
