'use client';

import * as taskActions from '@/app/actions/task.actions';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, Edit, Trash2, Plus } from 'lucide-react';
import * as contactActions from '@/app/actions/contact.actions';
import * as dealActions from '@/app/actions/deal.actions';
import * as invoiceActions from '@/app/actions/invoice.actions';
import * as clientActions from '@/app/actions/client.actions';
import { Client } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import ClientDeleteModal from '@/components/crm/ClientDeleteModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [associatedCounts, setAssociatedCounts] = useState({ contacts: 0, deals: 0, invoices: 0, tasks: 0 });
  const [isDeleting, setIsDeleting] = useState(false);

  const loadClients = async () => {
    if (!user?.organizationId) return;
    try {
      setLoading(true);
      const data = await clientActions.findAllAction(user.organizationId);
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

  const handleDeleteClick = async (client: Client) => {
    // Récupérer les comptes des entités associées
    const contacts = await contactActions.findByClientIdAction(client.id, user?.organizationId);
    const deals = await dealActions.findByClientIdAction(client.id, user?.organizationId);
    const invoices = await invoiceActions.findByClientAction(client.id);
    const tasks = user?.organizationId ? await taskActions.findByEntityAction('client', client.id, user.organizationId) : [];
    
    setClientToDelete(client);
    setAssociatedCounts({
      contacts: contacts.length,
      deals: deals.length,
      invoices: invoices.length,
      tasks: tasks.length,
    });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete || !user?.organizationId) return;
    setIsDeleting(true);
    try {
      // Pour l'instant, on supprime seulement le client via le service
      // TODO: Gérer la suppression en cascade avec les futurs services
      await clientActions.deleteWithCascadeAction(clientToDelete.id, user.organizationId, user.id);
      await loadClients();
    } catch (error) {
      console.error('Erreur lors de la suppression', error);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setClientToDelete(null);
    }
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
        <Link href="/clients/new" data-tour="create-client-btn" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un client
        </Link>
      </div>

      <div className="mb-4">
        <Input 
          type="text" 
          placeholder="Rechercher par nom ou email..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
          label="Recherche"
          hideLabel
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">Chargement...</div>
      ) : filteredClients.length === 0 && search === '' ? (
        <div className="text-center py-16 px-4 sm:px-6 lg:px-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <Plus className="h-6 w-6 text-indigo-600" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">Aucun client</h3>
          <p className="mt-1 text-sm text-gray-500">
            Commencez par ajouter votre premier client pour pouvoir créer des devis et factures.
          </p>
          <div className="mt-6">
            <Link
              href="/clients/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              Nouveau client
            </Link>
          </div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Aucun client trouvé pour "{search}".</div>
      ) : (
        <div className="space-y-4">
          {/* Vue mobile: Cartes */}
          <div className="sm:hidden space-y-4">
            {filteredClients.map((client) => (
              <Card key={client.id}>
                <CardHeader>
                  <span className="font-bold text-gray-900">{client.name}</span>
                </CardHeader>
                <CardBody>
                  <div>{client.email || <span className="text-gray-400 italic">Pas d'email</span>}</div>
                  <div>{client.phone || <span className="text-gray-400 italic">Pas de téléphone</span>}</div>
                </CardBody>
                <CardFooter>
                  <Link href={`/clients/${client.id}`} className="text-indigo-600 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1" aria-label={`Voir ${client.name}`}>
                    <Eye className="h-5 w-5" />
                  </Link>
                  <Link href={`/clients/${client.id}/edit`} className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1" aria-label={`Modifier ${client.name}`}>
                    <Edit className="h-5 w-5" />
                  </Link>
                  <button onClick={() => handleDeleteClick(client)} className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label={`Supprimer ${client.name}`}>
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
                  <TableHeader>Nom</TableHeader>
                  <TableHeader>Email</TableHeader>
                  <TableHeader>Téléphone</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium text-gray-900">{client.name}</TableCell>
                    <TableCell>{client.email || '-'}</TableCell>
                    <TableCell>{client.phone || '-'}</TableCell>
                    <TableCell className="text-right space-x-3">
                      <Link href={`/clients/${client.id}`} className="text-indigo-600 hover:text-indigo-900 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1" aria-label={`Voir ${client.name}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link href={`/clients/${client.id}/edit`} className="text-blue-600 hover:text-blue-900 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1" aria-label={`Modifier ${client.name}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button onClick={() => handleDeleteClick(client)} className="text-red-600 hover:text-red-900 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label={`Supprimer ${client.name}`}>
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

      {clientToDelete && (
        <ClientDeleteModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setClientToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          clientName={clientToDelete.name}
          associatedCounts={associatedCounts}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
