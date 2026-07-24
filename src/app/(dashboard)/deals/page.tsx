'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { dealRepository, clientRepository } from '@/lib/data';
import { Deal, Client, DealStatus } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import DealPipeline from '@/components/crm/DealPipeline';

export default function DealsPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!user?.organizationId) return;
    const organizationId = user.organizationId;

    let isMounted = true;

    const fetchData = async () => {
      try {
        const [dealsData, clientsData] = await Promise.all([
          dealRepository.findByOrganization(organizationId),
          clientRepository.findByOrganization(organizationId)
        ]);

        if (isMounted) {
          setDeals(dealsData);
          setClients(clientsData);
          setLoading(false);
        }
      } catch (error) {
        console.error('Erreur', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user?.organizationId, refreshTrigger]);

  const handleStatusChange = async (dealId: string, newStatus: DealStatus) => {
    // Mise à jour optimiste pour une meilleure UX
    setDeals(currentDeals => 
      currentDeals.map(deal => 
        deal.id === dealId ? { ...deal, status: newStatus, updatedAt: new Date().toISOString() } : deal
      )
    );
    
    try {
      await dealRepository.update(dealId, { status: newStatus, updatedAt: new Date().toISOString() });
      setRefreshTrigger(prev => prev + 1); // Rafraîchissement en arrière-plan
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut', error);
      setRefreshTrigger(prev => prev + 1); // Annulation/rafraîchissement en cas d'erreur
    }
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
        <DealPipeline deals={deals} clients={clients} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}
