'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  FileText,
  Calendar,
  DollarSign,
  Briefcase,
  ArrowUpRight,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { FieldServiceWorkspaceConfig } from '@/lib/workspaces/types';
import DashboardChart from '@/components/crm/DashboardChart';

interface FieldServiceDashboardProps {
  workspace: FieldServiceWorkspaceConfig;
  organization: {
    name: string;
    sector?: string | null;
    profession?: string | null;
  };
  stats: {
    clients: number;
    activeDeals: number;
    ongoingTasks: number;
    revenue: number;
    totalInvoiced: number;
    totalUnpaid: number;
  };
  operationsMetrics?: {
    total: number;
    draft: number;
    scheduled: number;
    inProgress: number;
    paused: number;
    completed: number;
    cancelled: number;
    todayOperations: number;
    overdueOperations: number;
  };
  chartData: { month: string; revenue: number }[];
}

export default function FieldServiceDashboard({
  workspace,
  organization,
  stats,
  operationsMetrics,
  chartData,
}: FieldServiceDashboardProps) {
  const terminology = workspace.terminology;
  const headerTitle =
    workspace.professionPack?.dashboard?.headerTitle ||
    workspace.label ||
    'Espace BTP & Services Techniques';
  const quickActionNote =
    workspace.professionPack?.dashboard?.quickActionNote ||
    'Pilotez vos chantiers, interventions, devis et factures';

  const opSingular = terminology.operationSingular || 'Intervention';
  const opPlural = terminology.operationPlural || 'Interventions';

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {headerTitle}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100">
              {workspace.professionPack?.shortLabel || workspace.professionPack?.label || 'Professionnel'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {organization.name} — {quickActionNote}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/operations/nouveau"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nouvelle {opSingular.toLowerCase()}
          </Link>
          <Link
            href="/facturation/devis"
            className="inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Nouveau devis
          </Link>
        </div>
      </div>

      {/* Operations Highlights (if available) */}
      {operationsMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {opPlural} en cours
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-900">{operationsMetrics.inProgress}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Link href="/operations?status=in_progress" className="text-primary-600 hover:underline inline-flex items-center">
                Voir les opérations en cours <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </Link>
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Planifiées
              </span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-900">{operationsMetrics.scheduled}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Link href="/operations?status=scheduled" className="text-primary-600 hover:underline inline-flex items-center">
                Consulter le planning <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </Link>
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Aujourd&apos;hui
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-900">{operationsMetrics.todayOperations}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Link href="/operations" className="text-primary-600 hover:underline inline-flex items-center">
                Voir toutes les opérations <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </Link>
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Terminées
              </span>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-900">{operationsMetrics.completed}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Link href="/operations?status=completed" className="text-primary-600 hover:underline inline-flex items-center">
                Consulter l&apos;historique <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards (Clients, Deals, Revenue, Tasks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Clients */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {terminology.customerPlural || 'Clients'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-gray-900">{stats.clients}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Link href="/clients" className="text-primary-600 hover:underline inline-flex items-center">
              Voir le répertoire <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </p>
        </div>

        {/* Opportunités / Deals */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Opportunités en cours
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-gray-900">{stats.activeDeals}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Link href="/deals" className="text-primary-600 hover:underline inline-flex items-center">
              Suivre le pipeline <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </p>
        </div>

        {/* Chiffre d'affaires encaissé */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Chiffre d&apos;affaires
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-gray-900">
              {stats.revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Link href="/facturation/factures" className="text-primary-600 hover:underline inline-flex items-center">
              Facturation globale <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </p>
        </div>

        {/* Tâches / Planning */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Tâches & Rendez-vous
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-gray-900">{stats.ongoingTasks}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Link href="/agenda/calendrier" className="text-primary-600 hover:underline inline-flex items-center">
              Ouvrir le planning <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </p>
        </div>
      </div>

      {/* Evolution Chart */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Activité & Chiffre d&apos;affaires</h2>
            <p className="text-xs text-gray-500">Historique des 6 derniers mois</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-gray-50 text-gray-600 rounded-lg border border-gray-100">
            6 mois
          </span>
        </div>
        <div className="pt-4">
          <DashboardChart data={chartData} />
        </div>
      </div>
    </div>
  );
}
