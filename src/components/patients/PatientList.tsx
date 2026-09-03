'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Phone, 
  Mail, 
  UserCheck, 
  UserX,
  Filter,
  RefreshCw
} from 'lucide-react';
import { PatientProfileDTO, PatientListResult } from '@/lib/patients/types';
import { listPatientsAction } from '@/app/actions/patient-registry.actions';

interface PatientListProps {
  initialData: PatientListResult;
}

export default function PatientList({ initialData }: PatientListProps) {
  const router = useRouter();
  const [data, setData] = useState<PatientListResult>(initialData);
  const [birthName, setBirthName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [activeFilter, setActiveFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [page, setPage] = useState(0);
  const [isPending, startTransition] = useTransition();
  const limit = 25;

  const handleSearch = (newPage = 0) => {
    startTransition(async () => {
      try {
        const res = await listPatientsAction({
          birthName: birthName || undefined,
          firstName: firstName || undefined,
          birthDate: birthDate || undefined,
          active: activeFilter,
          limit,
          offset: newPage * limit,
        });
        setData(res);
        setPage(newPage);
      } catch (error) {
        console.error('Erreur lors de la recherche des patients', error);
      }
    });
  };

  const handleReset = () => {
    setBirthName('');
    setFirstName('');
    setBirthDate('');
    setActiveFilter('active');
    startTransition(async () => {
      try {
        const res = await listPatientsAction({
          active: 'active',
          limit,
          offset: 0,
        });
        setData(res);
        setPage(0);
      } catch (error) {
        console.error('Erreur lors de la réinitialisation', error);
      }
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Registre des Patients
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestion de l’identité administrative et des représentants
          </p>
        </div>
        <Link
          href="/patients/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau patient
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter className="w-4 h-4 text-blue-600" />
          Filtres de recherche
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label htmlFor="filter-birth-name" className="block text-xs font-medium text-gray-600 mb-1">
              Nom (naissance / usage)
            </label>
            <input
              id="filter-birth-name"
              type="text"
              value={birthName}
              onChange={(e) => setBirthName(e.target.value)}
              placeholder="Ex: Dupont"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
            />
          </div>
          <div>
            <label htmlFor="filter-first-name" className="block text-xs font-medium text-gray-600 mb-1">
              Prénom (naissance / usage)
            </label>
            <input
              id="filter-first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ex: Marie"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
            />
          </div>
          <div>
            <label htmlFor="filter-birth-date" className="block text-xs font-medium text-gray-600 mb-1">
              Date de naissance
            </label>
            <input
              id="filter-birth-date"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="filter-status" className="block text-xs font-medium text-gray-600 mb-1">
              Statut
            </label>
            <select
              id="filter-status"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'active' | 'archived' | 'all')}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="active">Actifs uniquement</option>
              <option value="archived">Archivés uniquement</option>
              <option value="all">Tous les statuts</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={() => handleSearch(0)}
            disabled={isPending}
            className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            {isPending ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-3.5">Identité</th>
                <th className="px-6 py-3.5">Date de naissance</th>
                <th className="px-6 py-3.5">Sexe</th>
                <th className="px-6 py-3.5">Coordonnées</th>
                <th className="px-6 py-3.5">Statut</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.length > 0 ? (
                data.rows.map((patient: PatientProfileDTO) => {
                  const displayName = patient.usedName || patient.birthName;
                  const displayFirstName = patient.usedFirstName || patient.firstBirthName;
                  const hasUsageName = Boolean(patient.usedName && patient.usedName !== patient.birthName);

                  return (
                    <tr
                      key={patient.id}
                      onClick={() => router.push(`/patients/${patient.id}`)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {displayName} {displayFirstName}
                        </div>
                        {hasUsageName && (
                          <div className="text-xs text-gray-400">
                            Nom de naissance : {patient.birthName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(patient.birthDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 capitalize">
                        {patient.sex === 'female' && 'Féminin'}
                        {patient.sex === 'male' && 'Masculin'}
                        {patient.sex === 'indeterminate' && 'Indéterminé'}
                        {patient.sex === 'unknown' && 'Inconnu'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 space-y-0.5">
                        {patient.phone && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {patient.phone}
                          </div>
                        )}
                        {patient.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {patient.email}
                          </div>
                        )}
                        {!patient.phone && !patient.email && (
                          <span className="text-xs text-gray-400">Non renseigné</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {patient.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            <UserCheck className="w-3 h-3" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            <UserX className="w-3 h-3" />
                            Archivé
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/patients/${patient.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Consulter
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="font-medium text-gray-700">Aucun patient trouvé</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Modifiez vos critères de recherche ou créez un nouveau patient.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {data.total > 0 && (
          <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <div>
              Affichage de {data.rows.length > 0 ? page * limit + 1 : 0} à{' '}
              {Math.min((page + 1) * limit, data.total)} sur {data.total} patients
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSearch(page - 1)}
                disabled={page === 0 || isPending}
                className="p-1.5 rounded-md border border-gray-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {page + 1} sur {Math.max(totalPages, 1)}
              </span>
              <button
                type="button"
                onClick={() => handleSearch(page + 1)}
                disabled={page + 1 >= totalPages || isPending}
                className="p-1.5 rounded-md border border-gray-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Page suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
