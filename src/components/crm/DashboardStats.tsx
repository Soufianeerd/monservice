'use client';

import React from 'react';
import { Users, Briefcase, CheckSquare, TrendingUp, AlertCircle } from 'lucide-react';

interface DashboardStatsProps {
  clientsCount: number;
  activeDealsCount: number;
  ongoingTasksCount: number;
  totalRevenue: number;
  paidInvoicesCount?: number;
}

export default function DashboardStats({ clientsCount, activeDealsCount, ongoingTasksCount, totalRevenue, paidInvoicesCount = 0 }: DashboardStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div data-guide-title="Clients" data-guide-text="Nombre de fiches clients de votre activité. Ouvrez Clients pour créer ou rechercher un destinataire." className="bg-white rounded-lg shadow p-6 border border-gray-200 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Clients</h2>
          <p className="mt-1 text-2xl font-bold text-gray-900">{clientsCount}</p>
        </div>
      </div>

      <div data-guide-title="Affaires gagnées" data-guide-text="Nombre d’affaires marquées gagnées dans votre pipeline. Ouvrez Opportunités pour suivre les affaires en cours." className="bg-white rounded-lg shadow p-6 border border-gray-200 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
          <Briefcase className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Affaires gagnées</h2>
          <p className="mt-1 text-2xl font-bold text-gray-900">{activeDealsCount}</p>
        </div>
      </div>

      <div data-guide-title="Tâches en attente" data-guide-text="Indicateur des tâches au statut en attente. Ouvrez Tâches pour consulter tous les rappels et leurs échéances." className="bg-white rounded-lg shadow p-6 border border-gray-200 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
          <CheckSquare className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Tâches en attente</h2>
          <p className="mt-1 text-2xl font-bold text-gray-900">{ongoingTasksCount}</p>
        </div>
      </div>

      <div data-guide-title="Chiffre d’affaires encaissé" data-guide-text="Somme des montants TTC des factures marquées payées. Consultez Factures pour vérifier les règlements." className="bg-white rounded-lg shadow p-6 border border-gray-200 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-green-100 text-green-600">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Chiffre d’affaires encaissé</h2>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      <div data-guide-title="Factures réglées" data-guide-text="Nombre de factures marquées payées, distinct du montant encaissé. Consultez Factures pour retrouver les documents." className="bg-white rounded-lg shadow p-6 border border-gray-200 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-red-100 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Factures réglées</h2>
          <p className="mt-1 text-2xl font-bold text-gray-900">{Number(paidInvoicesCount).toLocaleString('fr-FR')}</p>
        </div>
      </div>
    </div>
  );
}
