'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, Edit, Trash2, Plus } from 'lucide-react';
import { contactRepository, clientRepository } from '@/lib/data';
import { Contact, Client } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';

type ContactWithClient = Contact & { clientName: string };

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState('');

  const loadData = async () => {
    if (!user?.organizationId) return;
    try {
      await Promise.resolve();
      setLoading(true);
      const [contactsData, clientsData] = await Promise.all([
        contactRepository.findByOrganization(user.organizationId),
        clientRepository.findByOrganization(user.organizationId)
      ]);

      const clientMap = new Map(clientsData.map(c => [c.id, c.name]));

      const enriched = contactsData.map(c => ({
        ...c,
        clientName: clientMap.get(c.clientId) || 'Inconnu'
      }));

      setContacts(enriched);
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

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) return;
    await contactRepository.delete(id);
    loadData();
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) || 
                          (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
    const matchesClient = selectedClient === '' || c.clientId === selectedClient;
    return matchesSearch && matchesClient;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-2 text-sm text-gray-500">Gérez les contacts de vos clients.</p>
        </div>
        <Link href="/contacts/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un contact
        </Link>
      </div>

      <div className="flex space-x-4 mb-4">
        <input 
          type="text" 
          placeholder="Rechercher par nom ou email..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="px-4 py-2 border border-gray-300 bg-white rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Tous les clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">Chargement...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Aucun contact trouvé.</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom complet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Poste</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contact.firstName} {contact.lastName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.clientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.position || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <Link href={`/contacts/${contact.id}`} className="text-indigo-600 hover:text-indigo-900 inline-flex">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link href={`/contacts/${contact.id}/edit`} className="text-blue-600 hover:text-blue-900 inline-flex">
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button onClick={() => handleDelete(contact.id)} className="text-red-600 hover:text-red-900 inline-flex">
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
