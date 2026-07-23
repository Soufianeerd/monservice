'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Edit, ArrowLeft } from 'lucide-react';
import { contactRepository, clientRepository } from '@/lib/data';
import { Contact, Client } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import QuickActions from '@/components/crm/QuickActions';

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.organizationId) return;
      const c = await contactRepository.getById(params.id as string);
      if (c && c.organizationId === user.organizationId) {
        setContact(c);
        const cli = await clientRepository.getById(c.clientId);
        setClient(cli);
      } else {
        router.push('/contacts');
      }
      setLoading(false);
    }
    load();
  }, [params.id, user, router]);

  if (loading) return <div className="p-8 text-center animate-pulse">Chargement...</div>;
  if (!contact) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{contact.firstName} {contact.lastName}</h1>
        </div>
        <Link href={`/contacts/${contact.id}/edit`} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Edit className="h-4 w-4 mr-2" />
          Modifier
        </Link>
      </div>

      <QuickActions entityType="contact" entity={contact} />

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Informations du contact</h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Prénom</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{contact.firstName}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Nom</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{contact.lastName}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Client</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {client ? (
                  <Link href={`/clients/${client.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {client.name}
                  </Link>
                ) : '-'}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Poste / Fonction</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{contact.position || '-'}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {contact.email ? <a href={`mailto:${contact.email}`} className="text-indigo-600 hover:text-indigo-900">{contact.email}</a> : '-'}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{contact.phone || '-'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
