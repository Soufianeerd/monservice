'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  SchedulingBootstrapDTO,
  SchedulingPatientOptionDTO,
  WaitlistEntryDTO,
} from '@/lib/scheduling/types';
import {
  createWaitlistEntryAction,
  updateWaitlistEntryAction,
  searchPatientsAction,
} from '@/app/actions/scheduling.actions';

interface Props {
  bootstrap: SchedulingBootstrapDTO;
  initialData?: WaitlistEntryDTO | null;
  onSuccess: (entry: WaitlistEntryDTO) => void;
  onCancel: () => void;
}

export function WaitlistForm({
  bootstrap,
  initialData,
  onSuccess,
  onCancel,
}: Props) {
  const isEditing = Boolean(initialData);

  // Form Fields
  const [patientId, setPatientId] = useState(initialData?.patientId || '');
  const [selectedPatientDisplay, setSelectedPatientDisplay] = useState(
    initialData?.patientName || ''
  );
  const [locationId, setLocationId] = useState(
    initialData?.locationId || bootstrap.locations[0]?.id || ''
  );
  const [practitionerId, setPractitionerId] = useState(
    initialData?.practitionerId || ''
  );
  const [appointmentTypeId, setAppointmentTypeId] = useState(
    initialData?.appointmentTypeId || bootstrap.appointmentTypes[0]?.id || ''
  );
  const [preferredDateFrom, setPreferredDateFrom] = useState(
    initialData?.preferredDateFrom || ''
  );
  const [preferredDateUntil, setPreferredDateUntil] = useState(
    initialData?.preferredDateUntil || ''
  );
  const [preferredStartTime, setPreferredStartTime] = useState(
    initialData?.preferredStartTime ? initialData.preferredStartTime.slice(0, 5) : ''
  );
  const [preferredEndTime, setPreferredEndTime] = useState(
    initialData?.preferredEndTime ? initialData.preferredEndTime.slice(0, 5) : ''
  );

  // Patient Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SchedulingPatientOptionDTO[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Submission State
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedLocation = bootstrap.locations.find((l) => l.id === locationId);
  const availablePractitioners = bootstrap.practitioners.filter((p) =>
    locationId ? p.assignedLocationIds.includes(locationId) : true
  );

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await searchPatientsAction(searchQuery.trim(), 10);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectPatient = (patient: SchedulingPatientOptionDTO) => {
    setPatientId(patient.id);
    setSelectedPatientDisplay(`${patient.displayName} (Né(e) le ${patient.birthDate})`);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!patientId) {
      setErrorMessage('Veuillez sélectionner un patient');
      return;
    }

    if (!locationId) {
      setErrorMessage('Veuillez sélectionner un lieu');
      return;
    }

    if (!appointmentTypeId) {
      setErrorMessage('Veuillez sélectionner un type de séance');
      return;
    }

    if (!preferredDateFrom) {
      setErrorMessage('Veuillez spécifier une date de début de disponibilité');
      return;
    }

    startTransition(async () => {
      try {
        if (isEditing && initialData) {
          const updated = await updateWaitlistEntryAction({
            id: initialData.id,
            patientId,
            locationId,
            appointmentTypeId,
            practitionerId: practitionerId || null,
            preferredDateFrom,
            preferredDateUntil: preferredDateUntil || null,
            preferredStartTime: preferredStartTime || null,
            preferredEndTime: preferredEndTime || null,
          });
          onSuccess(updated);
        } else {
          const created = await createWaitlistEntryAction({
            patientId,
            locationId,
            appointmentTypeId,
            practitionerId: practitionerId || null,
            preferredDateFrom,
            preferredDateUntil: preferredDateUntil || null,
            preferredStartTime: preferredStartTime || null,
            preferredEndTime: preferredEndTime || null,
          });
          onSuccess(created);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Une erreur est survenue lors de l'enregistrement de l'inscription en liste d'attente.");
        }
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">
          {isEditing ? "Modifier l'inscription en attente" : "Inscrire un patient en liste d'attente"}
        </h3>
        <button
          onClick={onCancel}
          type="button"
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
        >
          &times;
        </button>
      </div>

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* PATIENT SELECTION */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Patient *</label>
          {selectedPatientDisplay ? (
            <div className="mt-1 flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-semibold text-blue-900">{selectedPatientDisplay}</span>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setPatientId('');
                    setSelectedPatientDisplay('');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Changer
                </button>
              )}
            </div>
          ) : (
            <div className="relative mt-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou prénom..."
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5 text-xs text-gray-400">Recherche...</div>
              )}
              {searchResults.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 border-b border-gray-50"
                    >
                      <div className="font-semibold text-gray-900">{p.displayName}</div>
                      <div className="text-xs text-gray-500">Né(e) le {p.birthDate}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* LOCATION & PRACTITIONER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Lieu de consultation *</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {bootstrap.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Fuseau : {selectedLocation?.timezone || 'Europe/Paris'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Praticien souhaité</label>
            <select
              value={practitionerId}
              onChange={(e) => setPractitionerId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Tous les praticiens disponibles</option>
              {availablePractitioners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* APPOINTMENT TYPE */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Type de séance souhaité *</label>
          <select
            value={appointmentTypeId}
            onChange={(e) => setAppointmentTypeId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {bootstrap.appointmentTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.durationMinutes} min)
              </option>
            ))}
          </select>
        </div>

        {/* DATE INTERVAL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Disponible à partir du *</label>
            <input
              type="date"
              required
              value={preferredDateFrom}
              onChange={(e) => setPreferredDateFrom(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Jusqu'au</label>
            <input
              type="date"
              value={preferredDateUntil}
              onChange={(e) => setPreferredDateUntil(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* TIME PREFERENCE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Heure de début préférée</label>
            <input
              type="time"
              value={preferredStartTime}
              onChange={(e) => setPreferredStartTime(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Heure de fin préférée</label>
            <input
              type="time"
              value={preferredEndTime}
              onChange={(e) => setPreferredEndTime(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending || !patientId || !preferredDateFrom}
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : "Inscrire en liste d'attente"}
          </button>
        </div>
      </form>
    </div>
  );
}
