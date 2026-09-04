'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  SchedulingBootstrapDTO,
  SchedulingPatientOptionDTO,
  AppointmentDTO,
} from '@/lib/scheduling/types';
import {
  createAppointmentAction,
  rescheduleAppointmentAction,
  searchPatientsAction,
} from '@/app/actions/scheduling.actions';

interface Props {
  bootstrap: SchedulingBootstrapDTO;
  initialData?: {
    appointmentId?: string;
    patientId?: string;
    patientName?: string;
    practitionerId?: string;
    appointmentTypeId?: string;
    locationId?: string;
    roomId?: string | null;
    localDate?: string;
    localStartTime?: string;
  };
  onSuccess: (appointment: AppointmentDTO) => void;
  onCancel: () => void;
}

export function AppointmentForm({
  bootstrap,
  initialData,
  onSuccess,
  onCancel,
}: Props) {
  const isReschedule = Boolean(initialData?.appointmentId);

  // Form Fields
  const [patientId, setPatientId] = useState(initialData?.patientId || '');
  const [selectedPatientDisplay, setSelectedPatientDisplay] = useState(
    initialData?.patientName || ''
  );
  const [practitionerId, setPractitionerId] = useState(
    initialData?.practitionerId || bootstrap.practitioners[0]?.id || ''
  );
  const [locationId, setLocationId] = useState(
    initialData?.locationId || bootstrap.locations[0]?.id || ''
  );
  const [roomId, setRoomId] = useState(initialData?.roomId || '');
  const [appointmentTypeId, setAppointmentTypeId] = useState(
    initialData?.appointmentTypeId || bootstrap.appointmentTypes[0]?.id || ''
  );
  const [localDate, setLocalDate] = useState(
    initialData?.localDate || new Date().toISOString().slice(0, 10)
  );
  const [localStartTime, setLocalStartTime] = useState(
    initialData?.localStartTime || '09:00'
  );

  // Patient Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SchedulingPatientOptionDTO[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Submission State
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected entities
  const selectedLocation = bootstrap.locations.find((l) => l.id === locationId);
  const selectedType = bootstrap.appointmentTypes.find((t) => t.id === appointmentTypeId);
  const availableRooms = bootstrap.rooms.filter((r) => r.locationId === locationId);

  // Filter practitioners assigned to this location
  const availablePractitioners = bootstrap.practitioners.filter((p) =>
    locationId ? p.assignedLocationIds.includes(locationId) : true
  );

  // Handle patient search debounce
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

  const calculateEndTime = () => {
    if (!selectedType || !localStartTime) return '';
    const [h, m] = localStartTime.split(':').map(Number);
    if (h === undefined || m === undefined) return '';
    const totalMinutes = h * 60 + m + selectedType.durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!patientId) {
      setErrorMessage('Veuillez sélectionner un patient');
      return;
    }

    startTransition(async () => {
      try {
        if (isReschedule && initialData?.appointmentId) {
          const updated = await rescheduleAppointmentAction({
            appointmentId: initialData.appointmentId,
            patientId,
            practitionerId,
            appointmentTypeId,
            locationId,
            roomId: roomId || null,
            localDate,
            localStartTime,
          });
          onSuccess(updated);
        } else {
          const created = await createAppointmentAction({
            patientId,
            practitionerId,
            appointmentTypeId,
            locationId,
            roomId: roomId || null,
            localDate,
            localStartTime,
          });
          onSuccess(created);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Une erreur est survenue lors de l’enregistrement de la séance.');
        }
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {isReschedule ? 'Replanifier la séance' : 'Planifier une nouvelle séance'}
      </h3>
      <p className="text-xs text-gray-500 mb-6">
        Fuseau horaire de planification : <span className="font-semibold text-gray-700">{selectedLocation?.timezone || 'Europe/Paris'}</span>
      </p>

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* PATIENT SEARCH */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Patient *</label>
          {selectedPatientDisplay ? (
            <div className="mt-1 flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-semibold text-blue-900">{selectedPatientDisplay}</span>
              {!isReschedule && (
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
              onChange={(e) => {
                setLocationId(e.target.value);
                setRoomId('');
              }}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {bootstrap.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Praticien *</label>
            <select
              value={practitionerId}
              onChange={(e) => setPractitionerId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {availablePractitioners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TYPE & ROOM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Type de séance *</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700">Salle (optionnel)</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Aucune salle spécifique</option>
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* DATE & TIME */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date locale *</label>
            <input
              type="date"
              required
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Heure de début *</label>
            <input
              type="time"
              required
              value={localStartTime}
              onChange={(e) => setLocalStartTime(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* RECAP SUMMARY */}
        {selectedType && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1">
            <div className="flex justify-between font-semibold text-gray-800">
              <span>Horaire de consultation :</span>
              <span>
                {localStartTime} → {calculateEndTime()} ({selectedType.durationMinutes} min)
              </span>
            </div>
            {(selectedType.bufferBeforeMinutes > 0 || selectedType.bufferAfterMinutes > 0) && (
              <div className="flex justify-between text-gray-500">
                <span>Plage d&apos;occupation praticien (buffers inclus) :</span>
                <span>
                  +{selectedType.bufferBeforeMinutes}m avant / +{selectedType.bufferAfterMinutes}m après
                </span>
              </div>
            )}
          </div>
        )}

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
            disabled={isPending || !patientId}
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Enregistrement...' : isReschedule ? 'Replanifier' : 'Confirmer le rendez-vous'}
          </button>
        </div>
      </form>
    </div>
  );
}
