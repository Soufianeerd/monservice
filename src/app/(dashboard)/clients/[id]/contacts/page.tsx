'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Eye, Edit, Trash2, Plus } from 'lucide-react';
import * as contactActions from '@/app/actions/contact.actions';
import { Contact } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import { Input } from '@/components/ui/Input';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';

export default function ClientContactsPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    if (!user?.organizationId) return;
    try {
      const contactsData = await contactActions.findByClientIdAction(params.id, user.organizationId);
      setContacts(contactsData);
    } catch (error) {
      console.error('Erreur', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId, params.id]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) return;
    setLoading(true);
    try {
      await contactActions.deleteAction(id);
      await loadData();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) || 
                          (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
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
        <Link href={`/clients/${params.id}/contacts/new`} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau contact
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">Chargement...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
          Aucun contact trouvé pour ce client.
        </div>
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
                  <div>{contact.email || <span className="text-gray-400 italic">Pas d'email</span>}</div>
                  <div>{contact.position || <span className="text-gray-400 italic">Pas de poste</span>}</div>
                </CardBody>
                <CardFooter>
                  <Link href={`/clients/${params.id}/contacts/${contact.id}`} className="text-indigo-600 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1">
                    <Eye className="h-5 w-5" />
                  </Link>
                  <Link href={`/clients/${params.id}/contacts/${contact.id}/edit`} className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1">
                    <Edit className="h-5 w-5" />
                  </Link>
                  <button onClick={() => handleDelete(contact.id)} className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1">
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
                  <TableHeader>Email</TableHeader>
                  <TableHeader>Poste</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium text-gray-900">{contact.firstName} {contact.lastName}</TableCell>
                    <TableCell>{contact.email || '-'}</TableCell>
                    <TableCell>{contact.position || '-'}</TableCell>
                    <TableCell className="text-right space-x-3">
                      <Link href={`/clients/${params.id}/contacts/${contact.id}`} className="text-indigo-600 hover:text-indigo-900 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link href={`/clients/${params.id}/contacts/${contact.id}/edit`} className="text-blue-600 hover:text-blue-900 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1">
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button onClick={() => handleDelete(contact.id)} className="text-red-600 hover:text-red-900 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1">
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
