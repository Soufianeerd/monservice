'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ClientForm from '@/components/crm/ClientForm';
import * as clientActions from '@/app/actions/client.actions';
import { useAuth } from '@/components/auth/AuthContext';
import { Client } from '@/lib/data/interfaces';

export default function EditClientPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.organizationId) return;
      const data = await clientActions.findByIdAction(params.id as string, user.organizationId);
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
      await clientActions.updateAction(id, user.organizationId, {
        ...data,
      });

      if (user) {
        // activityLog disabled
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
