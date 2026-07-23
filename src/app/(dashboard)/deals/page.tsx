'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { dealRepository, clientRepository } from '@/lib/data';
import { Deal, Client, DealStage } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import DealPipeline from '@/components/crm/DealPipeline';

export default function DealsPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user?.organizationId) return;
    try {
      await Promise.resolve();
      setLoading(true);
      const [dealsData, clientsData] = await Promise.all([
        dealRepository.findByOrganization(user.organizationId),
        clientRepository.findByOrganization(user.organizationId)
      ]);

      setDeals(dealsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Erreur', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.organizationId]);

  const handleStageChange = async (dealId: string, newStage: DealStage) => {
    await dealRepository.update(dealId, { stage: newStage, updatedAt: new Date().toISOString() });
    loadData(); // Reload data to reflect changes
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deals</h1>
          <p className="mt-2 text-sm text-gray-500">Gérez vos opportunités commerciales.</p>
        </div>
        <Link href="/deals/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau deal
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">Chargement...</div>
      ) : (
        <DealPipeline deals={deals} clients={clients} onStageChange={handleStageChange} />
      )}
    </div>
  );
}
