'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  SchedulingBootstrapDTO,
  WaitlistEntryDTO,
  WaitlistFilters,
  WaitlistStatus,
  WaitlistResolutionCode,
  WAITLIST_RESOLUTION_CODES,
} from '@/lib/scheduling/types';
import {
  listWaitlistEntriesAction,
  resolveWaitlistEntryAction,
} from '@/app/actions/scheduling.actions';
import { WaitlistForm } from './WaitlistForm';

interface Props {
  bootstrap: SchedulingBootstrapDTO;
}

const RESOLUTION_LABELS: Record<WaitlistResolutionCode, string> = {
  booked: 'Rendez-vous planifié',
  withdrawn: 'Désistement du patient',
  not_needed: 'Besoin caduc / Plus nécessaire',
  other: 'Autre motif administratif',
};

export function WaitlistManager({ bootstrap }: Props) {
  const [entries, setEntries] = useState<WaitlistEntryDTO[]>([]);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | 'all'>('waiting');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [practitionerFilter, setPractitionerFilter] = useState<string>('');
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEntryForEdit, setSelectedEntryForEdit] = useState<WaitlistEntryDTO | null>(null);

  // Resolution Modal State
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [entryToResolve, setEntryToResolve] = useState<WaitlistEntryDTO | null>(null);
  const [resolutionCode, setResolutionCode] = useState<WaitlistResolutionCode>('booked');
  const [resolvedAppointmentId, setResolvedAppointmentId] = useState<string>('');
  const [isResolving, setIsResolving] = useState(false);

  const loadEntries = () => {
    startTransition(async () => {
      try {
        setErrorMessage(null);
        const filters: WaitlistFilters = {
          status: statusFilter === 'all' ? undefined : statusFilter,
          locationId: locationFilter || undefined,
          practitionerId: practitionerFilter || undefined,
          appointmentTypeId: appointmentTypeFilter || undefined,
          search: searchQuery.trim() || undefined,
        };
        const result = await listWaitlistEntriesAction(filters);
        setEntries(result.entries);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Erreur de chargement de la liste d'attente");
        }
      }
    });
  };

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, locationFilter, practitionerFilter, appointmentTypeFilter, searchQuery]);

  const handleOpenCreate = () => {
    setSelectedEntryForEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (entry: WaitlistEntryDTO) => {
    setSelectedEntryForEdit(entry);
    setIsFormOpen(true);
  };

  const handleOpenResolve = (entry: WaitlistEntryDTO) => {
    setEntryToResolve(entry);
    setResolutionCode('booked');
    setResolvedAppointmentId('');
    setIsResolveModalOpen(true);
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryToResolve) return;

    setIsResolving(true);
    try {
      await resolveWaitlistEntryAction({
        id: entryToResolve.id,
        resolutionCode,
        resolvedAppointmentId: resolutionCode === 'booked' ? resolvedAppointmentId.trim() || undefined : undefined,
      });
      setIsResolveModalOpen(false);
      setEntryToResolve(null);
      loadEntries();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Erreur lors de la résolution de l'inscription.");
      }
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER & FILTERS */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Liste d&apos;attente des patients</h2>
            <p className="text-xs text-gray-500">
              Gérez les demandes de rendez-vous en attente et faites correspondre les créneaux libérés.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            + Inscrire un patient
          </button>
        </div>

        {/* Filters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as WaitlistStatus | 'all')}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="waiting">En attente uniquement</option>
              <option value="resolved">Résolus uniquement</option>
              <option value="all">Tous les statuts</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Lieu
            </label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Tous les lieux</option>
              {bootstrap.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Praticien
            </label>
            <select
              value={practitionerFilter}
              onChange={(e) => setPractitionerFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Tous les praticiens</option>
              {bootstrap.practitioners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Type de séance
            </label>
            <select
              value={appointmentTypeFilter}
              onChange={(e) => setAppointmentTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Tous les types</option>
              {bootstrap.appointmentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Recherche patient
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nom ou prénom..."
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">
                  Lieu (Fuseau)
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">
                  Praticien / Type
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">
                  Disponibilités
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-500 text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    {isPending ? "Chargement des inscriptions..." : "Aucun patient en liste d'attente ne correspond aux filtres."}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{entry.patientName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 font-medium">{entry.locationName}</div>
                        <div className="text-xs text-gray-400">{entry.timezone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">
                          {entry.practitionerName || (
                            <span className="text-gray-400 italic">Tous praticiens</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {entry.appointmentTypeName || 'Tous types'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div>
                          Du {entry.preferredDateFrom}
                          {entry.preferredDateUntil ? ` au ${entry.preferredDateUntil}` : ''}
                        </div>
                        {entry.preferredStartTime && entry.preferredEndTime ? (
                          <div className="text-gray-500">
                            Heures : {entry.preferredStartTime.slice(0, 5)} - {entry.preferredEndTime.slice(0, 5)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {entry.status === 'waiting' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            En attente
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              Résolu
                            </span>
                            {entry.resolutionCode && (
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                {RESOLUTION_LABELS[entry.resolutionCode]}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs space-x-2 whitespace-nowrap">
                        {entry.status === 'waiting' && (
                          <>
                            <button
                              onClick={() => handleOpenResolve(entry)}
                              className="font-medium text-emerald-600 hover:text-emerald-900"
                            >
                              Résoudre
                            </button>
                            <button
                              onClick={() => handleOpenEdit(entry)}
                              className="font-medium text-blue-600 hover:text-blue-900"
                            >
                              Modifier
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <WaitlistForm
            bootstrap={bootstrap}
            initialData={selectedEntryForEdit}
            onSuccess={() => {
              setIsFormOpen(false);
              loadEntries();
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </div>
      )}

      {/* RESOLVE MODAL */}
      {isResolveModalOpen && entryToResolve && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Résoudre l&apos;inscription de {entryToResolve.patientName}
            </h3>
            <p className="text-xs text-gray-500">
              La résolution clôture définitivement l&apos;entrée en liste d&apos;attente (état terminal immuable).
            </p>

            <form onSubmit={handleConfirmResolve} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motif de résolution *
                </label>
                <select
                  value={resolutionCode}
                  onChange={(e) => setResolutionCode(e.target.value as WaitlistResolutionCode)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isResolving}
                >
                  {WAITLIST_RESOLUTION_CODES.map((code) => (
                    <option key={code} value={code}>
                      {RESOLUTION_LABELS[code]}
                    </option>
                  ))}
                </select>
              </div>

              {resolutionCode === 'booked' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Identifiant de la séance planifiée *
                  </label>
                  <input
                    type="text"
                    required
                    value={resolvedAppointmentId}
                    onChange={(e) => setResolvedAppointmentId(e.target.value)}
                    placeholder="Identifiant du rendez-vous..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={isResolving}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={isResolving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isResolving || (resolutionCode === 'booked' && !resolvedAppointmentId.trim())}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isResolving ? 'Clôture...' : 'Confirmer la résolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
