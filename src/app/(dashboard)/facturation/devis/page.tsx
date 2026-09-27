'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { useEffect, useState } from 'react';
import type { Invoice } from '@/lib/data/interfaces';
import * as invoiceActions from '@/app/actions/invoice.actions';
import QuotesSentList from '@/components/marketplace/QuotesSentList';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';

export default function QuotesDashboardPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'accepted' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.organizationId) {
      invoiceActions
        .findByProfessionalAction(user.organizationId)
        .then((invs) => {
          setQuotes(
            invs
              .filter((i) => i.type === 'quote')
              .sort(
                (a, b) =>
                  new Date(b.createdAt || b.date).getTime() -
                  new Date(a.createdAt || a.date).getTime()
              )
          );
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  const filteredQuotes = quotes.filter((q) => {
    if (filter === 'all') return true;
    if (filter === 'draft') return q.status === 'draft';
    if (filter === 'sent') return q.status === 'sent' || q.status === 'viewed';
    if (filter === 'accepted') return q.status === 'accepted' || q.status === 'paid';
    if (filter === 'rejected') return q.status === 'rejected' || q.status === 'cancelled';
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Devis &amp; Chiffrages
          </h1>
          <p className="text-sm text-gray-500">
            Chiffrez vos chantiers, suivez les signatures électroniques et convertissez en interventions.
          </p>
        </div>

        <Link
          href="/facturation/devis/nouveau"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau devis
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 pb-2 text-xs font-medium">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-md ${
            filter === 'all'
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Tous ({quotes.length})
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-3 py-1.5 rounded-md ${
            filter === 'draft'
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Brouillons ({quotes.filter((q) => q.status === 'draft').length})
        </button>
        <button
          onClick={() => setFilter('sent')}
          className={`px-3 py-1.5 rounded-md ${
            filter === 'sent'
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Envoyés ({quotes.filter((q) => q.status === 'sent' || q.status === 'viewed').length})
        </button>
        <button
          onClick={() => setFilter('accepted')}
          className={`px-3 py-1.5 rounded-md ${
            filter === 'accepted'
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Acceptés ({quotes.filter((q) => q.status === 'accepted' || q.status === 'paid').length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-3 py-1.5 rounded-md ${
            filter === 'rejected'
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Refusés ({quotes.filter((q) => q.status === 'rejected' || q.status === 'cancelled').length})
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Chargement des devis...</div>
      ) : (
        <QuotesSentList quotes={filteredQuotes} />
      )}
    </div>
  );
}
