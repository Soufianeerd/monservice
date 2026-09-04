'use client';

import React, { useState, useTransition } from 'react';
import {
  AvailabilityRuleDTO,
  AvailabilityExceptionDTO,
  SchedulingPractitionerDTO,
  SchedulingLocationDTO,
} from '@/lib/scheduling/types';
import {
  createAvailabilityRuleAction,
  updateAvailabilityRuleAction,
  setAvailabilityRuleActiveAction,
  createAvailabilityExceptionAction,
  updateAvailabilityExceptionAction,
  setAvailabilityExceptionActiveAction,
} from '@/app/actions/scheduling.actions';
import { getCurrentLocalDateInTimezone } from '@/lib/scheduling/availability';

const WEEKDAYS = [
  { id: 1, name: 'Lundi' },
  { id: 2, name: 'Mardi' },
  { id: 3, name: 'Mercredi' },
  { id: 4, name: 'Jeudi' },
  { id: 5, name: 'Vendredi' },
  { id: 6, name: 'Samedi' },
  { id: 0, name: 'Dimanche' },
];

interface Props {
  practitioners: SchedulingPractitionerDTO[];
  locations: SchedulingLocationDTO[];
  initialRules: AvailabilityRuleDTO[];
  initialExceptions: AvailabilityExceptionDTO[];
}

export function AvailabilityManager({
  practitioners,
  locations,
  initialRules,
  initialExceptions,
}: Props) {
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>(
    practitioners[0]?.id || ''
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    locations[0]?.id || ''
  );

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const selectedTimezone = selectedLocation?.timezone || 'Europe/Paris';

  const [rules, setRules] = useState<AvailabilityRuleDTO[]>(initialRules);
  const [exceptions, setExceptions] = useState<AvailabilityExceptionDTO[]>(initialExceptions);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rule Modal state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AvailabilityRuleDTO | null>(null);
  const [ruleFormData, setRuleFormData] = useState({
    weekday: 1,
    startTime: '09:00',
    endTime: '18:00',
    validFrom: getCurrentLocalDateInTimezone(new Date(), selectedTimezone),
    validUntil: '',
  });

  // Exception Modal state
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [editingException, setEditingException] = useState<AvailabilityExceptionDTO | null>(null);
  const [exceptionFormData, setExceptionFormData] = useState({
    localDate: getCurrentLocalDateInTimezone(new Date(), selectedTimezone),
    kind: 'closed' as 'open' | 'closed',
    isAllDay: true,
    startTime: '09:00',
    endTime: '18:00',
  });

  // Filtered lists
  const filteredRules = rules.filter(
    (r) =>
      (!selectedPractitionerId || r.practitionerId === selectedPractitionerId) &&
      (!selectedLocationId || r.locationId === selectedLocationId)
  );

  const filteredExceptions = exceptions.filter(
    (e) =>
      (!selectedPractitionerId || e.practitionerId === selectedPractitionerId) &&
      (!selectedLocationId || e.locationId === selectedLocationId)
  );

  const openCreateRuleModal = () => {
    setEditingRule(null);
    setRuleFormData({
      weekday: 1,
      startTime: '09:00',
      endTime: '18:00',
      validFrom: getCurrentLocalDateInTimezone(new Date(), selectedTimezone),
      validUntil: '',
    });
    setErrorMessage(null);
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: AvailabilityRuleDTO) => {
    setEditingRule(rule);
    setRuleFormData({
      weekday: rule.weekday,
      startTime: rule.startTime.slice(0, 5),
      endTime: rule.endTime.slice(0, 5),
      validFrom: rule.validFrom,
      validUntil: rule.validUntil || '',
    });
    setErrorMessage(null);
    setIsRuleModalOpen(true);
  };

  const handleToggleRuleActive = (rule: AvailabilityRuleDTO) => {
    startTransition(async () => {
      try {
        setErrorMessage(null);
        const updated = await setAvailabilityRuleActiveAction(rule.id, !rule.isActive);
        setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Une erreur est survenue.');
        }
      }
    });
  };

  const handleRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        if (editingRule) {
          const updated = await updateAvailabilityRuleAction({
            id: editingRule.id,
            practitionerId: selectedPractitionerId,
            locationId: selectedLocationId,
            weekday: Number(ruleFormData.weekday),
            startTime: ruleFormData.startTime,
            endTime: ruleFormData.endTime,
            validFrom: ruleFormData.validFrom,
            validUntil: ruleFormData.validUntil || null,
          });
          setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        } else {
          const created = await createAvailabilityRuleAction({
            practitionerId: selectedPractitionerId,
            locationId: selectedLocationId,
            weekday: Number(ruleFormData.weekday),
            startTime: ruleFormData.startTime,
            endTime: ruleFormData.endTime,
            validFrom: ruleFormData.validFrom,
            validUntil: ruleFormData.validUntil || null,
          });
          setRules((prev) => [...prev, created]);
        }
        setIsRuleModalOpen(false);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Une erreur est survenue lors de l’enregistrement de la règle.');
        }
      }
    });
  };

  const openCreateExceptionModal = () => {
    setEditingException(null);
    setExceptionFormData({
      localDate: getCurrentLocalDateInTimezone(new Date(), selectedTimezone),
      kind: 'closed',
      isAllDay: true,
      startTime: '09:00',
      endTime: '18:00',
    });
    setErrorMessage(null);
    setIsExceptionModalOpen(true);
  };

  const openEditExceptionModal = (exc: AvailabilityExceptionDTO) => {
    setEditingException(exc);
    setExceptionFormData({
      localDate: exc.localDate,
      kind: exc.kind,
      isAllDay: !exc.startTime && !exc.endTime,
      startTime: exc.startTime ? exc.startTime.slice(0, 5) : '09:00',
      endTime: exc.endTime ? exc.endTime.slice(0, 5) : '18:00',
    });
    setErrorMessage(null);
    setIsExceptionModalOpen(true);
  };

  const handleToggleExceptionActive = (exc: AvailabilityExceptionDTO) => {
    startTransition(async () => {
      try {
        setErrorMessage(null);
        const updated = await setAvailabilityExceptionActiveAction(exc.id, !exc.isActive);
        setExceptions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Une erreur est survenue.');
        }
      }
    });
  };

  const handleExceptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const startTime = exceptionFormData.isAllDay ? null : exceptionFormData.startTime;
        const endTime = exceptionFormData.isAllDay ? null : exceptionFormData.endTime;

        if (editingException) {
          const updated = await updateAvailabilityExceptionAction({
            id: editingException.id,
            practitionerId: selectedPractitionerId,
            locationId: selectedLocationId,
            localDate: exceptionFormData.localDate,
            kind: exceptionFormData.kind,
            startTime,
            endTime,
          });
          setExceptions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        } else {
          const created = await createAvailabilityExceptionAction({
            practitionerId: selectedPractitionerId,
            locationId: selectedLocationId,
            localDate: exceptionFormData.localDate,
            kind: exceptionFormData.kind,
            startTime,
            endTime,
          });
          setExceptions((prev) => [...prev, created]);
        }
        setIsExceptionModalOpen(false);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Une erreur est survenue lors de l’enregistrement de l’exception.');
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Praticien
            </label>
            <select
              value={selectedPractitionerId}
              onChange={(e) => setSelectedPractitionerId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 bg-white font-medium"
            >
              {practitioners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} {!p.isActive ? '(Inactif)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Lieu de consultation
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 bg-white font-medium"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.timezone})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto justify-end">
          <button
            onClick={openCreateRuleModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            + Règle hebdomadaire
          </button>
          <button
            onClick={openCreateExceptionModal}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            + Exception ponctuelle
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}

      {/* SECTION 1: WEEKLY RULES */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Disponibilités hebdomadaires récurrentes</h3>
            <p className="text-xs text-gray-500 mt-1">
              Définit les plages d&apos;ouverture standard du praticien sur chaque jour de la semaine.
            </p>
          </div>
        </div>

        {filteredRules.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Aucune règle récurrente configurée pour ce praticien sur ce lieu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Jour</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Horaires</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Validité</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredRules.map((rule) => {
                  const dayName = WEEKDAYS.find((w) => w.id === rule.weekday)?.name || `Jour ${rule.weekday}`;
                  return (
                    <tr key={rule.id} className={!rule.isActive ? 'bg-gray-50/60 opacity-75' : undefined}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {dayName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {rule.startTime.slice(0, 5)} → {rule.endTime.slice(0, 5)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        Du {rule.validFrom} {rule.validUntil ? `au ${rule.validUntil}` : '(sans fin)'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {rule.isActive ? 'Active' : 'Désactivée'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button
                          onClick={() => openEditRuleModal(rule)}
                          disabled={isPending}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleToggleRuleActive(rule)}
                          disabled={isPending}
                          className={`${
                            rule.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {rule.isActive ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: EXCEPTIONS */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Exceptions ponctuelles & Fermetures</h3>
            <p className="text-xs text-gray-500 mt-1">
              Fermeture de cabinet, congés ou ouvertures exceptionnelles. Les fermetures priment toujours sur les ouvertures.
            </p>
          </div>
        </div>

        {filteredExceptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Aucune exception ponctuelle enregistrée pour ce praticien sur ce lieu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nature</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Plage horaire</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredExceptions.map((exc) => (
                  <tr key={exc.id} className={!exc.isActive ? 'bg-gray-50/60 opacity-75' : undefined}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {exc.localDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          exc.kind === 'closed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {exc.kind === 'closed' ? 'Fermeture / Indisponible' : 'Ouverture exceptionnelle'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {exc.startTime && exc.endTime ? (
                        `${exc.startTime.slice(0, 5)} → ${exc.endTime.slice(0, 5)}`
                      ) : (
                        <span className="font-medium text-gray-600">Journée entière</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          exc.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {exc.isActive ? 'Active' : 'Désactivée'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => openEditExceptionModal(exc)}
                        disabled={isPending}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleToggleExceptionActive(exc)}
                        disabled={isPending}
                        className={`${
                          exc.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {exc.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RULE MODAL */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingRule ? 'Modifier la règle récurrente' : 'Nouvelle règle hebdomadaire'}
            </h3>

            <form onSubmit={handleRuleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Jour de la semaine *</label>
                <select
                  value={ruleFormData.weekday}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, weekday: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {WEEKDAYS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Heure de début *</label>
                  <input
                    type="time"
                    required
                    value={ruleFormData.startTime}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, startTime: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Heure de fin *</label>
                  <input
                    type="time"
                    required
                    value={ruleFormData.endTime}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, endTime: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valide à partir du *</label>
                  <input
                    type="date"
                    required
                    value={ruleFormData.validFrom}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, validFrom: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valide jusqu&apos;au (optionnel)</label>
                  <input
                    type="date"
                    value={ruleFormData.validUntil}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, validUntil: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEPTION MODAL */}
      {isExceptionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingException ? 'Modifier l’exception ponctuelle' : 'Nouvelle exception ponctuelle'}
            </h3>

            <form onSubmit={handleExceptionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date concernée *</label>
                <input
                  type="date"
                  required
                  value={exceptionFormData.localDate}
                  onChange={(e) =>
                    setExceptionFormData({ ...exceptionFormData, localDate: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type d&apos;exception *</label>
                <div className="mt-2 space-x-4 flex">
                  <label className="inline-flex items-center text-sm font-medium text-gray-700">
                    <input
                      type="radio"
                      name="kind"
                      value="closed"
                      checked={exceptionFormData.kind === 'closed'}
                      onChange={() => setExceptionFormData({ ...exceptionFormData, kind: 'closed' })}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-2">Fermeture / Indisponible</span>
                  </label>
                  <label className="inline-flex items-center text-sm font-medium text-gray-700">
                    <input
                      type="radio"
                      name="kind"
                      value="open"
                      checked={exceptionFormData.kind === 'open'}
                      onChange={() => setExceptionFormData({ ...exceptionFormData, kind: 'open' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">Ouverture exceptionnelle</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="inline-flex items-center text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={exceptionFormData.isAllDay}
                    onChange={(e) =>
                      setExceptionFormData({ ...exceptionFormData, isAllDay: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2">Journée entière</span>
                </label>
              </div>

              {!exceptionFormData.isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Heure de début *</label>
                    <input
                      type="time"
                      required={!exceptionFormData.isAllDay}
                      value={exceptionFormData.startTime}
                      onChange={(e) =>
                        setExceptionFormData({ ...exceptionFormData, startTime: e.target.value })
                      }
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Heure de fin *</label>
                    <input
                      type="time"
                      required={!exceptionFormData.isAllDay}
                      value={exceptionFormData.endTime}
                      onChange={(e) =>
                        setExceptionFormData({ ...exceptionFormData, endTime: e.target.value })
                      }
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsExceptionModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
