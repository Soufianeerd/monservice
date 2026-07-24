'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, Edit, Trash2, Plus } from 'lucide-react';
import { contactRepository, clientRepository } from '@/lib/data';
import { Contact, Client } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) return;
    setLoading(true);
    try {
      await contactRepository.delete(id);
      await loadData();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
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

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1 max-w-md">
          <Input 
            type="text" 
            placeholder="Rechercher par nom ou email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            label="Recherche"
            hideLabel
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            label="Filtrer par client"
            hideLabel
          >
            <option value="">Tous les clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">Chargement...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Aucun contact trouvé.</div>
      ) : (
        <div className="space-y-4">
          {/* Vue mobile: Cartes */}
          <div className="sm:hidden space-y-4">
            {filteredContacts.map((contact) => (
              <Card key={contact.id}>
                <CardHeader>
                  <span className="font-bold text-gray-900">{contact.firstName} {contact.lastName}</span>
                </CardHeader>
                <CardBody>
                  <div className="text-sm font-medium text-gray-900 bg-gray-50 inline-block px-2 py-1 rounded mb-1">{contact.clientName}</div>
                  <div>{contact.email || <span className="text-gray-400 italic">Pas d'email</span>}</div>
                  <div>{contact.position || <span className="text-gray-400 italic">Pas de poste</span>}</div>
                </CardBody>
                <CardFooter>
                  <Link href={`/contacts/${contact.id}`} className="text-indigo-600 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1" aria-label={`Voir ${contact.firstName} ${contact.lastName}`}>
                    <Eye className="h-5 w-5" />
                  </Link>
                  <Link href={`/contacts/${contact.id}/edit`} className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1" aria-label={`Modifier ${contact.firstName} ${contact.lastName}`}>
                    <Edit className="h-5 w-5" />
                  </Link>
                  <button onClick={() => handleDelete(contact.id)} className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label={`Supprimer ${contact.firstName} ${contact.lastName}`}>
                    <Trash2 className="h-5 w-5" />
                  </button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Vue desktop: Tableau */}
          <div className="hidden sm:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Nom complet</TableHeader>
                  <TableHeader>Client</TableHeader>
                  <TableHeader>Email</TableHeader>
                  <TableHeader>Poste</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium text-gray-900">{contact.firstName} {contact.lastName}</TableCell>
                    <TableCell>{contact.clientName}</TableCell>
                    <TableCell>{contact.email || '-'}</TableCell>
                    <TableCell>{contact.position || '-'}</TableCell>
                    <TableCell className="text-right space-x-3">
                      <Link href={`/contacts/${contact.id}`} className="text-indigo-600 hover:text-indigo-900 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1" aria-label={`Voir ${contact.firstName} ${contact.lastName}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link href={`/contacts/${contact.id}/edit`} className="text-blue-600 hover:text-blue-900 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1" aria-label={`Modifier ${contact.firstName} ${contact.lastName}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button onClick={() => handleDelete(contact.id)} className="text-red-600 hover:text-red-900 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label={`Supprimer ${contact.firstName} ${contact.lastName}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
