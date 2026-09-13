'use client';

import React, { useState, useTransition } from 'react';
import { AppointmentTypeDTO } from '@/lib/scheduling/types';
import {
  createAppointmentTypeAction,
  updateAppointmentTypeAction,
  setAppointmentTypeActiveAction,
  installParamedicalAppointmentTypePresetAction,
} from '@/app/actions/scheduling.actions';
import type { ParamedicalProfessionPack } from '@/lib/workspaces/paramedical/profession-packs/types';
import { CheckCircle2, Plus } from 'lucide-react';

interface Props {
  initialTypes: AppointmentTypeDTO[];
  professionPack?: ParamedicalProfessionPack;
}

export function AppointmentTypeManager({ initialTypes, professionPack }: Props) {
  const [types, setTypes] = useState<AppointmentTypeDTO[]>(initialTypes);
  const [isPending, startTransition] = useTransition();
  const [installingPresetId, setInstallingPresetId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<AppointmentTypeDTO | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleInstallPreset = (presetId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setInstallingPresetId(presetId);
    startTransition(async () => {
      try {
        const result = await installParamedicalAppointmentTypePresetAction(presetId);
        setTypes((prev) => {
          const exists = prev.some((t) => t.id === result.id);
          if (exists) {
            return prev.map((t) => (t.id === result.id ? result : t));
          }
          return [result, ...prev];
        });
        setSuccessMessage('Type de séance configuré avec succès');
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erreur lors de l’installation de la suggestion',
        );
      } finally {
        setInstallingPresetId(null);
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

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {successMessage}
        </div>
      )}

      {/* Profession Presets Section */}
      {professionPack && professionPack.appointmentTypePresets.length > 0 && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-blue-950">
              Suggestions pour votre activité ({professionPack.label})
            </h3>
            <p className="text-xs text-blue-700 mt-0.5">
              Modèles de séances types recommandés, configurables en un clic.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {professionPack.appointmentTypePresets.map((preset) => {
              const isInstalled = types.some(
                (t) =>
                  t.name.trim().toLowerCase() === preset.name.trim().toLowerCase() &&
                  t.durationMinutes === preset.durationMinutes,
              );
              const isInstalling = installingPresetId === preset.id;

              return (
                <div
                  key={preset.id}
                  className="bg-white border border-blue-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-900">{preset.name}</h4>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                        {preset.durationMinutes} min
                      </span>
                    </div>
                    {preset.description && (
                      <p className="text-xs text-gray-500">{preset.description}</p>
                    )}
                    <div className="text-[11px] text-gray-400 pt-1">
                      Buffers : +{preset.bufferBeforeMinutes}m av. / +{preset.bufferAfterMinutes}m ap. — Pas de {preset.slotStepMinutes}m
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-end">
                    {isInstalled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Type configuré
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInstallPreset(preset.id)}
                        disabled={isPending || isInstalling}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isInstalling ? 'Ajout en cours...' : 'Ajouter ce type de séance'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
