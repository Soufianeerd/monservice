'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  XCircle,
  FileText,
  Building,
} from 'lucide-react';
import type { FieldServiceWorkspaceConfig } from '@/lib/workspaces/types';

interface OperationItem {
  id: string;
  reference: string;
  title: string;
  workType: string;
  status: string;
  priority: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  createdAt: string;
  clientName: string | null;
  siteLabel: string | null;
  siteCity: string | null;
}

interface ClientOption {
  id: string;
  name: string;
}

interface OperationsListClientProps {
  workspace: FieldServiceWorkspaceConfig;
  initialOperations: OperationItem[];
  clientsList: ClientOption[];
}

const statusBadgeStyles: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  draft: { label: 'Brouillon', bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText },
  scheduled: { label: 'Planifié', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', icon: Calendar },
  in_progress: { label: 'En cours', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', icon: PlayCircle },
  paused: { label: 'En pause', bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700', icon: PauseCircle },
  completed: { label: 'Terminé', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
  cancelled: { label: 'Annulé', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700', icon: XCircle },
};

const priorityBadgeStyles: Record<string, { label: string; dot: string; text: string }> = {
  low: { label: 'Basse', dot: 'bg-gray-400', text: 'text-gray-600' },
  medium: { label: 'Normale', dot: 'bg-blue-500', text: 'text-blue-700' },
  high: { label: 'Haute', dot: 'bg-amber-500', text: 'text-amber-700' },
  urgent: { label: 'Urgente', dot: 'bg-rose-500', text: 'text-rose-700' },
};

export default function OperationsListClient({
  workspace,
  initialOperations,
  clientsList,
}: OperationsListClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  const terminology = workspace.terminology;
  const workSingular = terminology.workSingular || 'Opération';
  const workPlural = terminology.workPlural || 'Opérations';

  const filteredOperations = initialOperations.filter(op => {
    if (statusFilter !== 'all' && op.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && op.priority !== priorityFilter) return false;
    if (clientFilter !== 'all' && op.clientName !== clientFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchRef = op.reference.toLowerCase().includes(q);
      const matchTitle = op.title.toLowerCase().includes(q);
      const matchClient = op.clientName?.toLowerCase().includes(q) ?? false;
      const matchCity = op.siteCity?.toLowerCase().includes(q) ?? false;
      if (!matchRef && !matchTitle && !matchClient && !matchCity) return false;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6" data-testid="operations-list">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {workPlural}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestion, suivi et planification de vos {workPlural.toLowerCase()} sur le terrain
          </p>
        </div>

        <Link
          href="/operations/nouveau"
          data-testid="new-operation-button"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors focus:ring-2 focus:ring-primary-500 focus:outline-none"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau {workSingular.toLowerCase()}
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            data-testid="search-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={`Rechercher par référence, titre, client, ville...`}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <select
            data-testid="status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="scheduled">Planifié</option>
            <option value="in_progress">En cours</option>
            <option value="paused">En pause</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
          </select>

          {/* Priority Filter */}
          <select
            data-testid="priority-filter"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Toutes priorités</option>
            <option value="low">Basse</option>
            <option value="medium">Normale</option>
            <option value="high">Haute</option>
            <option value="urgent">Urgente</option>
          </select>

          {/* Client Filter */}
          {clientsList.length > 0 && (
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 max-w-[180px] truncate"
            >
              <option value="all">Tous les clients</option>
              {clientsList.map(c => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Operations List / Table */}
      {filteredOperations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Building className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Aucun {workSingular.toLowerCase()} trouvé</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? 'Essayez de modifier vos filtres de recherche.'
              : `Commencez par créer votre premier ${workSingular.toLowerCase()} pour piloter vos interventions.`}
          </p>
          <div className="mt-6">
            <Link
              href="/operations/nouveau"
              className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau {workSingular.toLowerCase()}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-4">Réf. / Titre</th>
                  <th className="py-3.5 px-4">Client / Site</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Priorité</th>
                  <th className="py-3.5 px-4">Planning</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredOperations.map(op => {
                  const statusInfo = statusBadgeStyles[op.status] || statusBadgeStyles.draft;
                  const priorityInfo = priorityBadgeStyles[op.priority] || priorityBadgeStyles.medium;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr
                      key={op.id}
                      data-testid="operation-row"
                      className="hover:bg-gray-50/60 transition-colors group"
                    >
                      <td className="py-4 px-4">
                        <Link href={`/operations/${op.id}`} className="block">
                          <span className="font-mono text-xs font-bold text-primary-600 block">
                            {op.reference}
                          </span>
                          <span className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                            {op.title}
                          </span>
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-gray-900 font-medium">{op.clientName || 'Client non spécifié'}</div>
                        {op.siteLabel && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {op.siteLabel} {op.siteCity ? `(${op.siteCity})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                          <span className={`w-2 h-2 rounded-full ${priorityInfo.dot}`} />
                          {priorityInfo.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600">
                        {op.scheduledStart ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(op.scheduledStart).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Non planifié</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/operations/${op.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                        >
                          Détails
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {filteredOperations.map(op => {
              const statusInfo = statusBadgeStyles[op.status] || statusBadgeStyles.draft;
              const priorityInfo = priorityBadgeStyles[op.priority] || priorityBadgeStyles.medium;
              const StatusIcon = statusInfo.icon;

              return (
                <Link
                  key={op.id}
                  href={`/operations/${op.id}`}
                  data-testid="operation-card"
                  className="block bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-primary-600">
                      {op.reference}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.bg}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{op.title}</h4>

                  <div className="text-xs text-gray-600 space-y-1 mt-2">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400" />
                      {op.clientName || 'Client'}
                    </div>
                    {op.siteLabel && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {op.siteLabel} {op.siteCity ? `(${op.siteCity})` : ''}
                      </div>
                    )}
                    {op.scheduledStart && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {new Date(op.scheduledStart).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
