'use client';

import React, { useState, useTransition } from 'react';
import {
  Activity,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type {
  ClinicalMeasurementDTO,
  CareEpisodeDTO,
  CreateClinicalMeasurementInput,
} from '@/lib/clinical/types';
import type {
  ParamedicalProfessionPack,
  ParamedicalMeasurementPreset,
} from '@/lib/workspaces/paramedical/profession-packs/types';

interface ClinicalMeasurementsSectionProps {
  measurements: ClinicalMeasurementDTO[];
  episodes: CareEpisodeDTO[];
  professionPack?: ParamedicalProfessionPack;
  onCreateMeasurement: (input: CreateClinicalMeasurementInput) => Promise<void>;
}

const DEFAULT_PRESETS: readonly ParamedicalMeasurementPreset[] = [
  { code: 'pain_score', label: 'Échelle visuelle de la douleur (EVA)', valueType: 'numeric', unit: '/10' },
  { code: 'weight', label: 'Poids corporel', valueType: 'numeric', unit: 'kg' },
  { code: 'height', label: 'Taille', valueType: 'numeric', unit: 'cm' },
  { code: 'range_of_motion', label: 'Amplitude articulaire', valueType: 'numeric', unit: '°' },
  { code: 'posture_observation', label: 'Observation posturale', valueType: 'text', unit: null },
];

export default function ClinicalMeasurementsSection({
  measurements,
  episodes,
  professionPack,
  onCreateMeasurement,
}: ClinicalMeasurementsSectionProps) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [filterCode, setFilterCode] = useState<string>('all');

  const [formCode, setFormCode] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [valueType, setValueType] = useState<'numeric' | 'text'>('numeric');
  const [formValueNumeric, setFormValueNumeric] = useState<string>('');
  const [formValueText, setFormValueText] = useState<string>('');
  const [formUnit, setFormUnit] = useState<string>('');
  const [formObservedAt, setFormObservedAt] = useState<string>(
    new Date().toISOString().slice(0, 16),
  );
  const [formEpisodeId, setFormEpisodeId] = useState<string>('');

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activePresets = professionPack?.measurementPresets?.length
    ? professionPack.measurementPresets
    : DEFAULT_PRESETS;

  const handleApplyPreset = (preset: ParamedicalMeasurementPreset) => {
    setFormCode(preset.code);
    setFormLabel(preset.label);
    setValueType(preset.valueType);
    setFormUnit(preset.unit || '');
  };

  const distinctCodes = Array.from(new Set(measurements.map((m) => m.code)));

  const filteredMeasurements = measurements.filter((m) => {
    if (filterCode !== 'all' && m.code !== filterCode) {
      return false;
    }
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const numericVal = valueType === 'numeric' && formValueNumeric.trim() ? Number(formValueNumeric) : null;
    const textVal = valueType === 'text' && formValueText.trim() ? formValueText.trim() : null;

    if (numericVal === null && textVal === null) {
      setErrorMessage('Veuillez renseigner une valeur numérique ou textuelle.');
      return;
    }

    startTransition(async () => {
      try {
        await onCreateMeasurement({
          careEpisodeId: formEpisodeId.trim() || null,
          code: formCode.trim(),
          label: formLabel.trim(),
          valueNumeric: numericVal,
          valueText: textVal,
          unit: formUnit.trim() || null,
          observedAt: new Date(formObservedAt).toISOString(),
        });

        setShowNewModal(false);
        setFormCode('');
        setFormLabel('');
        setFormValueNumeric('');
        setFormValueText('');
        setFormUnit('');
        setFormEpisodeId('');
        setSuccessMessage('Mesure enregistrée avec succès');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur enregistrement mesure');
      }
    });
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Action and Filter bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterCode}
            onChange={(e) => setFilterCode(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Toutes les mesures ({measurements.length})</option>
            {distinctCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Relever une mesure
        </button>
      </div>

      {/* Measurements List */}
      {filteredMeasurements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium">Aucune mesure enregistrée.</p>
          <p className="text-xs text-slate-400 mt-1">
            Enregistrez des scores cliniques, constantes, amplitudes ou observations pour suivre l'évolution du patient.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Date de relevé</th>
                <th className="py-3 px-4">Libellé</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4 text-right">Valeur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMeasurements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 text-slate-500 font-mono">
                    {formatDateTime(m.observedAt)}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{m.label}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[11px] rounded">
                      {m.code}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    <span>{m.valueNumeric !== null ? m.valueNumeric : m.valueText}</span>
                    {m.unit && <span className="text-slate-500 ml-1 font-normal">{m.unit}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Measurement Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Enregistrer une mesure clinique
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Mesure chiffrée ou observation structurée immuable.
            </p>

            {/* Presets */}
            <div className="mb-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Modèles rapides :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activePresets.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Code technique *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="ex: pain_score"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Libellé lisible *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="ex: Échelle de douleur EVA"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Type de valeur
                </label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                    <input
                      type="radio"
                      checked={valueType === 'numeric'}
                      onChange={() => setValueType('numeric')}
                      name="valType"
                    />
                    Numérique
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                    <input
                      type="radio"
                      checked={valueType === 'text'}
                      onChange={() => setValueType('text')}
                      name="valType"
                    />
                    Textuel / Observation
                  </label>
                </div>
              </div>

              {valueType === 'numeric' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Valeur numérique *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formValueNumeric}
                      onChange={(e) => setFormValueNumeric(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Unité (optionnelle)
                    </label>
                    <input
                      type="text"
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      placeholder="ex: kg, /10, °"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Observation textuelle *
                  </label>
                  <input
                    type="text"
                    required
                    value={formValueText}
                    onChange={(e) => setFormValueText(e.target.value)}
                    placeholder="ex: Bascule du bassin à droite"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date & Heure du relevé *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formObservedAt}
                    onChange={(e) => setFormObservedAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Épisode lié (optionnel)
                  </label>
                  <select
                    value={formEpisodeId}
                    onChange={(e) => setFormEpisodeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Aucun épisode</option>
                    {episodes.map((ep) => (
                      <option key={ep.id} value={ep.id}>
                        {ep.title || 'Sans titre'} ({ep.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
                >
                  {isPending ? 'Enregistrement...' : 'Enregistrer la mesure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
