'use client';

import React, { useState, useTransition } from 'react';
import { AppointmentTypeDTO } from '@/lib/scheduling/types';
import {
  createAppointmentTypeAction,
  updateAppointmentTypeAction,
  setAppointmentTypeActiveAction,
} from '@/app/actions/scheduling.actions';

interface Props {
  initialTypes: AppointmentTypeDTO[];
}

export function AppointmentTypeManager({ initialTypes }: Props) {
  const [types, setTypes] = useState<AppointmentTypeDTO[]>(initialTypes);
  const [isPending, startTransition] = useTransition();
  const [editingType, setEditingType] = useState<AppointmentTypeDTO | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMinutes: 30,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    slotStepMinutes: 15,
  });

  const openCreateModal = () => {
    setEditingType(null);
    setFormData({
      name: '',
      description: '',
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      slotStepMinutes: 15,
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (type: AppointmentTypeDTO) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || '',
      durationMinutes: type.durationMinutes,
      bufferBeforeMinutes: type.bufferBeforeMinutes,
      bufferAfterMinutes: type.bufferAfterMinutes,
      slotStepMinutes: type.slotStepMinutes,
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleToggleActive = (type: AppointmentTypeDTO) => {
    startTransition(async () => {
      try {
        setErrorMessage(null);
        const updated = await setAppointmentTypeActiveAction(type.id, !type.isActive);
        setTypes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Une erreur est survenue.');
        }
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        if (editingType) {
          const updated = await updateAppointmentTypeAction({
            id: editingType.id,
            name: formData.name,
            description: formData.description.trim() ? formData.description.trim() : null,
            durationMinutes: Number(formData.durationMinutes),
            bufferBeforeMinutes: Number(formData.bufferBeforeMinutes),
            bufferAfterMinutes: Number(formData.bufferAfterMinutes),
            slotStepMinutes: Number(formData.slotStepMinutes),
          });
          setTypes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        } else {
          const created = await createAppointmentTypeAction({
            name: formData.name,
            description: formData.description.trim() ? formData.description.trim() : null,
            durationMinutes: Number(formData.durationMinutes),
            bufferBeforeMinutes: Number(formData.bufferBeforeMinutes),
            bufferAfterMinutes: Number(formData.bufferAfterMinutes),
            slotStepMinutes: Number(formData.slotStepMinutes),
          });
          setTypes((prev) => [created, ...prev]);
        }
        setIsModalOpen(false);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Une erreur est survenue lors de l’enregistrement.');
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Types de séances</h2>
          <p className="text-sm text-gray-500 mt-1">
            Définissez les motifs de consultation, durées et temps de préparation (buffers).
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          + Nouveau type de séance
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        {types.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Aucun type de séance configuré. Créez votre premier type pour commencer à planifier.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Nom & Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Durée
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Buffers (Avant / Après)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Pas de créneau
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {types.map((t) => (
                  <tr key={t.id} className={!t.isActive ? 'bg-gray-50/60 opacity-75' : undefined}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{t.name}</div>
                      {t.description && (
                        <div className="text-xs text-gray-500 max-w-xs truncate">{t.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {t.durationMinutes} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {t.bufferBeforeMinutes > 0 || t.bufferAfterMinutes > 0 ? (
                        <span>
                          +{t.bufferBeforeMinutes}m av. / +{t.bufferAfterMinutes}m ap.
                        </span>
                      ) : (
                        <span className="text-gray-400">Aucun</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {t.slotStepMinutes} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          t.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {t.isActive ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => openEditModal(t)}
                        disabled={isPending}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleToggleActive(t)}
                        disabled={isPending}
                        className={`${
                          t.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'
                        } transition-colors`}
                      >
                        {t.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingType ? 'Modifier le type de séance' : 'Nouveau type de séance'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom de la séance *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: Bilan diagnostic initial, Consultation de suivi..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Informations complémentaires..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Durée (minutes) *</label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={480}
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, durationMinutes: parseInt(e.target.value, 10) || 0 })
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Pas de créneau (min) *</label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={120}
                    value={formData.slotStepMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, slotStepMinutes: parseInt(e.target.value, 10) || 0 })
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Buffer avant (min)</label>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={formData.bufferBeforeMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bufferBeforeMinutes: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Buffer après (min)</label>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={formData.bufferAfterMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bufferAfterMinutes: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
