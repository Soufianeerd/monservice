'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import DealForm from '@/components/crm/DealForm';
import * as dealActions from '@/app/actions/deal.actions';
import * as clientActions from '@/app/actions/client.actions';
import { useAuth } from '@/components/auth/AuthContext';
import { Deal, Client } from '@/lib/data/interfaces';

export default function EditDealPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.organizationId) return;
      try {
        const dealData = await dealActions.findByIdAction(params.id as string, user.organizationId);

        if (dealData) {
          setDeal(dealData);
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
      await dealActions.updateAction(id, user.organizationId, {
        ...data,
      });

      // activityLog disabled

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
      <DealForm initialData={deal} organizationId={user?.organizationId || ''} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
