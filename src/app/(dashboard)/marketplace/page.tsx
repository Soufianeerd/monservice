'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { useEffect, useState } from 'react';
import { Request } from '@/lib/data/interfaces';

import RequestDiscoveryFilters, { DiscoveryFilters } from '@/components/marketplace/RequestDiscoveryFilters';
import RequestDiscoveryList from '@/components/marketplace/RequestDiscoveryList';
import { requestService } from '@/lib/services/request.service';

export default function MarketplacePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [filters, setFilters] = useState<DiscoveryFilters>({});

  useEffect(() => {
    if (user?.organizationId) {
      requestService.findPublic().then(setRequests);
    }
  }, [user, filters]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-gray-500">Trouvez de nouvelles opportunités et répondez aux appels d'offres des clients.</p>
      </div>

      <RequestDiscoveryFilters onFilterChange={setFilters} />
      <RequestDiscoveryList requests={requests} />
    </div>
  );
}
