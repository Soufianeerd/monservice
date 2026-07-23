'use client';

import React from 'react';
import { Users, Briefcase, CheckSquare, TrendingUp, FileText, AlertCircle } from 'lucide-react';

interface DashboardStatsProps {
  clientsCount: number;
  activeDealsCount: number;
  ongoingTasksCount: number;
  totalRevenue: number;
  totalInvoiced?: number;
  totalUnpaid?: number;
}

export default function DashboardStats({ clientsCount, activeDealsCount, ongoingTasksCount, totalRevenue, totalInvoiced = 0, totalUnpaid = 0 }: DashboardStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Clients</h3>
          <p className="mt-1 text-2xl font-bold text-gray-900">{clientsCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
          <Briefcase className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Deals Actifs</h3>
          <p className="mt-1 text-2xl font-bold text-gray-900">{activeDealsCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
          <CheckSquare className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Tâches en cours</h3>
          <p className="mt-1 text-2xl font-bold text-gray-900">{ongoingTasksCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-green-100 text-green-600">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">CA Généré</h3>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Total Facturé</h3>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalInvoiced)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-red-100 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Total Impayé</h3>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalUnpaid)}</p>
        </div>
      </div>
    </div>
  );
}
