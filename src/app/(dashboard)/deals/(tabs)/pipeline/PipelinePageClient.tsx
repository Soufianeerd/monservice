'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import * as dealActions from '@/app/actions/deal.actions';
import { Deal, Client, DealStatus } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import DealPipeline from '@/components/crm/DealPipeline';

export default function PipelinePageClient({ initialDeals, clients }: { initialDeals: Deal[]; clients: Client[] }) {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>(initialDeals);

  const reloadDeals = async () => {
    try {
      setDeals(await dealActions.findAllAction());
    } catch (error) {
      console.error('Erreur', error);
    }
  };

  const handleStatusChange = async (dealId: string, newStatus: DealStatus) => {
    if (!user?.organizationId) return;
    // Mise à jour optimiste pour une meilleure UX
    setDeals(currentDeals =>
      currentDeals.map(deal =>
        deal.id === dealId ? { ...deal, status: newStatus, updatedAt: new Date().toISOString() } : deal
      )
    );

    try {
      await dealActions.updateAction(dealId, user.organizationId, { status: newStatus });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut', error);
    }
    await reloadDeals();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Link href="/deals/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle opportunité
        </Link>
      </div>

      <DealPipeline deals={deals} clients={clients} onStatusChange={handleStatusChange} />
    </div>
  );
}
