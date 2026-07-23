'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, Edit, Trash2, Plus } from 'lucide-react';
import { clientRepository } from '@/lib/data';
import { Client } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadClients = async () => {
    if (!user?.organizationId) return;
    try {
      await Promise.resolve();
      setLoading(true);
      const data = await clientRepository.findByOrganization(user.organizationId);
      setClients(data);
    } catch (error) {
      console.error('Erreur lors du chargement des clients', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [user?.organizationId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return;
    await clientRepository.delete(id);
    loadClients();
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="mt-2 text-sm text-gray-500">
            Gérez vos clients. Seuls les clients de votre organisation sont affichés.
          </p>
        </div>
        <Link href="/clients/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un client
        </Link>
      </div>

      <div className="mb-4">
        <input 
          type="text" 
          placeholder="Rechercher par nom ou email..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">Chargement...</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Aucun client trouvé.</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <Link href={`/clients/${client.id}`} className="text-indigo-600 hover:text-indigo-900 inline-flex items-center">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link href={`/clients/${client.id}/edit`} className="text-blue-600 hover:text-blue-900 inline-flex items-center">
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button onClick={() => handleDelete(client.id)} className="text-red-600 hover:text-red-900 inline-flex items-center">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
