'use client';

import { useState, useEffect } from 'react';
import { clientRepository, organizationRepository } from '@/lib/data';
import { Client, Organization } from '@/lib/data/interfaces';

type ClientWithOrganization = Client & { organizationName: string };

interface ClientListProps {
  organizationId?: string;
}

export default function ClientList({ organizationId }: ClientListProps = {}) {
  const [clients, setClients] = useState<ClientWithOrganization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [clientsData, organizationsData] = await Promise.all([
          clientRepository.getAll(),
          organizationRepository.getAll()
        ]);

        const orgMap = new Map<string, Organization>();
        organizationsData.forEach(org => orgMap.set(org.id, org));

        // Filter by organizationId if provided
        const filteredClients = organizationId 
          ? clientsData.filter(c => c.organizationId === organizationId)
          : clientsData;

        const enrichedClients = filteredClients.map(client => ({
          ...client,
          organizationName: orgMap.get(client.organizationId)?.name || 'Inconnue'
        }));

        setClients(enrichedClients);
      } catch (error) {
        console.error('Failed to load clients', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500 animate-pulse">Chargement des clients...</div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Aucun client trouvé.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nom
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Téléphone
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Entreprise
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {clients.map((client) => (
            <tr key={client.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {client.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {client.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {client.phone}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {client.organizationName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button className="text-indigo-600 hover:text-indigo-900 mr-4 opacity-50 cursor-not-allowed" disabled>
                  Voir
                </button>
                <button className="text-indigo-600 hover:text-indigo-900 opacity-50 cursor-not-allowed" disabled>
                  Modifier
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
