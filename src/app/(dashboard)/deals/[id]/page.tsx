'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Edit, ArrowLeft, Trash2 } from 'lucide-react';
import { dealRepository, clientRepository } from '@/lib/data';
import { Deal, Client } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';

export default function DealDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.organizationId) return;
      const d = await dealRepository.getById(params.id as string);
      if (d && d.organizationId === user.organizationId) {
        setDeal(d);
        const cli = await clientRepository.getById(d.clientId);
        setClient(cli);
      } else {
        router.push('/deals');
      }
      setLoading(false);
    }
    load();
  }, [params.id, user, router]);

  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce deal ?")) return;
    await dealRepository.delete(params.id as string);
    router.push('/deals');
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Chargement...</div>;
  if (!deal) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{deal.name}</h1>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleDelete} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none">
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </button>
          <Link href={`/deals/${deal.id}/edit`} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Link>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Détails du deal</h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Nom</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{deal.name}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Client</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {client ? (
                  <Link href={`/clients/${client.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {client.name}
                  </Link>
                ) : '-'}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Valeur</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(deal.value)}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Étape</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {deal.stage}
                </span>
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date de clôture estimée</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {deal.expectedCloseDate ? new Intl.DateTimeFormat('fr-FR').format(new Date(deal.expectedCloseDate)) : '-'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
