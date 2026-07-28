'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { FileTextIcon, SearchIcon, MessageSquareIcon, FileCheckIcon } from 'lucide-react';
import Link from 'next/link';
import ClientStats from '@/components/client/ClientStats';
import ClientRecentActivity from '@/components/client/ClientRecentActivity';

export default function ClientDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.name}</h1>
        <p className="text-gray-500 mt-1">Bienvenue sur votre espace personnel MonService.</p>
      </div>

      {user && <ClientStats clientId={user.id} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Actions rapides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/client/requests/new" className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-sm transition-all group">
                <div className="p-3 bg-indigo-50 rounded-full text-indigo-600 group-hover:bg-indigo-100 mr-4">
                  <FileTextIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Publier une demande</h3>
                  <p className="text-sm text-gray-500">Trouver un professionnel</p>
                </div>
              </Link>

              <Link href="/client/quotes" className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-sm transition-all group">
                <div className="p-3 bg-indigo-50 rounded-full text-indigo-600 group-hover:bg-indigo-100 mr-4">
                  <FileCheckIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Voir mes devis</h3>
                  <p className="text-sm text-gray-500">Devis en attente</p>
                </div>
              </Link>

              <Link href="/client/invoices" className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-sm transition-all group">
                <div className="p-3 bg-indigo-50 rounded-full text-indigo-600 group-hover:bg-indigo-100 mr-4">
                  <SearchIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Mes factures</h3>
                  <p className="text-sm text-gray-500">Suivre mes paiements</p>
                </div>
              </Link>
              
              <Link href="/client/messages" className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-sm transition-all group">
                <div className="p-3 bg-indigo-50 rounded-full text-indigo-600 group-hover:bg-indigo-100 mr-4">
                  <MessageSquareIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Messagerie</h3>
                  <p className="text-sm text-gray-500">Discuter avec les pros</p>
                </div>
              </Link>
            </div>
          </section>
        </div>

        <div>
          {user && <ClientRecentActivity clientId={user.id} />}
        </div>
      </div>
    </div>
  );
}
