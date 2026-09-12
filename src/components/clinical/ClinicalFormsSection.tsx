'use client';

import React, { useState, useTransition } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Lock,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import type {
  ClinicalFormTemplateDTO,
  ClinicalFormResponseDTO,
  CareEpisodeDTO,
  ClinicalFormFieldDefinition,
  ClinicalFormFieldOption,
  ClinicalFormAnswers,
} from '@/lib/clinical/types';

interface ClinicalFormsSectionProps {
  templates: ClinicalFormTemplateDTO[];
  responses: ClinicalFormResponseDTO[];
  episodes: CareEpisodeDTO[];
  onCreateResponse: (templateId: string, episodeId: string | null, answers: ClinicalFormAnswers) => Promise<void>;
  onUpdateDraftResponse: (responseId: string, answers: ClinicalFormAnswers) => Promise<void>;
  onFinalizeResponse: (responseId: string, answers?: ClinicalFormAnswers) => Promise<void>;
  onCreateTemplate: (input: { name: string; kind: ClinicalFormTemplateDTO['kind']; description?: string; schemaJson: Record<string, unknown> }) => Promise<void>;
}

export default function ClinicalFormsSection({
  templates,
  responses,
  episodes,
  onCreateResponse,
  onUpdateDraftResponse,
  onFinalizeResponse,
  onCreateTemplate,
}: ClinicalFormsSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'responses' | 'new_response' | 'templates'>('responses');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('');

  // Active form filling state (for new response or draft editing)
  const [currentEditingResponseId, setCurrentEditingResponseId] = useState<string | null>(null);
  const [formAnswers, setFormAnswers] = useState<ClinicalFormAnswers>({});

  // Confirmation modal
  const [confirmFinalizeResponseId, setConfirmFinalizeResponseId] = useState<string | null>(null);

  // Template creation modal
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateKind, setNewTemplateKind] = useState<ClinicalFormTemplateDTO['kind']>('assessment');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateFieldsJson, setNewTemplateFieldsJson] = useState(
    JSON.stringify(
      {
        fields: [
          {
            id: 'general_comment',
            label: 'Observations générales',
            type: 'textarea',
            required: false,
          },
          {
            id: 'score',
            label: 'Score d’évaluation (0-10)',
            type: 'scale',
            min: 0,
            max: 10,
            step: 1,
            required: true,
          },
        ],
      },
      null,
      2,
    ),
  );

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleStartNewResponse = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setCurrentEditingResponseId(null);
    setFormAnswers({});
    setActiveSubTab('new_response');
  };

  const handleEditDraft = (response: ClinicalFormResponseDTO) => {
    setSelectedTemplateId(response.templateId);
    setCurrentEditingResponseId(response.id);
    setSelectedEpisodeId(response.careEpisodeId || '');
    setFormAnswers(response.answersJson || {});
    setActiveSubTab('new_response');
  };

  const handleAnswerChange = (
    fieldId: string,
    value: string | number | boolean | string[] | null | undefined,
  ) => {
    setFormAnswers((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        if (currentEditingResponseId) {
          await onUpdateDraftResponse(currentEditingResponseId, formAnswers);
          setSuccessMessage('Brouillon mis à jour');
        } else {
          await onCreateResponse(selectedTemplateId, selectedEpisodeId || null, formAnswers);
          setSuccessMessage('Brouillon enregistré');
        }
        setActiveSubTab('responses');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement');
      }
    });
  };

  const handleFinalizeSubmit = () => {
    if (!confirmFinalizeResponseId) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        await onFinalizeResponse(confirmFinalizeResponseId, formAnswers);
        setConfirmFinalizeResponseId(null);
        setSuccessMessage('Formulaire validé et finalisé avec succès (immuable)');
        setActiveSubTab('responses');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur lors de la finalisation');
      }
    });
  };

  const handleCreateTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const parsed = JSON.parse(newTemplateFieldsJson);
      startTransition(async () => {
        try {
          await onCreateTemplate({
            name: newTemplateName.trim(),
            kind: newTemplateKind,
            description: newTemplateDescription.trim() || undefined,
            schemaJson: parsed,
          });
          setShowNewTemplateModal(false);
          setNewTemplateName('');
          setNewTemplateDescription('');
          setSuccessMessage('Nouveau modèle de bilan créé');
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : 'Erreur création modèle');
        }
      });
    } catch {
      setErrorMessage('Format JSON invalide pour les champs du modèle');
    }
  };

  const renderField = (field: ClinicalFormFieldDefinition) => {
    const value = formAnswers[field.id];

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            required={field.required}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        );
      case 'textarea':
        return (
          <textarea
            rows={3}
            required={field.required}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        );
      case 'number':
        return (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="any"
              min={field.min}
              max={field.max}
              required={field.required}
              value={typeof value === 'number' ? value : ''}
              onChange={(e) =>
                handleAnswerChange(field.id, e.target.value === '' ? null : Number(e.target.value))
              }
              className="w-48 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {field.unit && <span className="text-xs text-slate-500">{field.unit}</span>}
          </div>
        );
      case 'boolean':
        return (
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleAnswerChange(field.id, e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <span className="text-xs text-slate-700 font-medium">Oui / Valide</span>
          </label>
        );
      case 'single_choice':
        return (
          <select
            required={field.required}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Sélectionner une option...</option>
            {field.options?.map((opt: ClinicalFormFieldOption) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case 'date':
        return (
          <input
            type="date"
            required={field.required}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
            className="w-48 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        );
      case 'scale': {
        const min = field.min ?? 0;
        const max = field.max ?? 10;
        const step = field.step ?? 1;
        const steps: number[] = [];
        for (let i = min; i <= max; i += step) {
          steps.push(i);
        }
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {steps.map((num) => (
              <button
                type="button"
                key={num}
                onClick={() => handleAnswerChange(field.id, num)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                  value === num
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        );
      }
      default:
        return null;
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
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

      {/* Sub Tabs Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('responses')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'responses'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Bilans & Réponses ({responses.length})
          </button>

          <button
            onClick={() => setActiveSubTab('templates')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'templates'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Modèles de bilans ({templates.length})
          </button>
        </div>

        {activeSubTab === 'responses' && templates.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleStartNewResponse(selectedTemplateId || templates[0].id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Remplir un bilan
            </button>
          </div>
        )}

        {activeSubTab === 'templates' && (
          <button
            onClick={() => setShowNewTemplateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Créer un modèle
          </button>
        )}
      </div>

      {/* Sub Tab: Responses List */}
      {activeSubTab === 'responses' && (
        <div className="space-y-4">
          {responses.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium">Aucun bilan paramédical complété pour ce patient.</p>
              <p className="text-xs text-slate-400 mt-1">
                Utilisez un modèle de formulaire pour saisir une évaluation structurée ou un bilan initial.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {responses.map((resp) => (
                <div
                  key={resp.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900">{resp.templateName}</span>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                          resp.status === 'finalized'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {resp.status === 'finalized' ? (
                          <>
                            <Lock className="w-2.5 h-2.5" /> Finalisé
                          </>
                        ) : (
                          'Brouillon'
                        )}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-4">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {resp.status === 'finalized' && resp.finalizedAt
                        ? `Finalisé le ${formatDate(resp.finalizedAt)}`
                        : `Créé le ${formatDate(resp.createdAt)}`}
                    </div>

                    {/* Answers Summary Preview */}
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1.5 text-xs text-slate-700 mb-4">
                      {Object.entries(resp.answersJson || {}).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">{key} :</span>
                          <span className="font-semibold text-slate-900 truncate max-w-[200px]">
                            {typeof val === 'boolean' ? (val ? 'Oui' : 'Non') : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {resp.status === 'draft' && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditDraft(resp)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                      >
                        <Edit3 className="w-3 h-3" />
                        Modifier
                      </button>
                      <button
                        onClick={() => {
                          setCurrentEditingResponseId(resp.id);
                          setFormAnswers(resp.answersJson || {});
                          setConfirmFinalizeResponseId(resp.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                      >
                        <Lock className="w-3 h-3" />
                        Finaliser
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub Tab: New / Edit Form Response */}
      {activeSubTab === 'new_response' && selectedTemplate && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">{selectedTemplate.name}</h3>
              {selectedTemplate.description && (
                <p className="text-xs text-slate-500 mt-1">{selectedTemplate.description}</p>
              )}
            </div>
            <button
              onClick={() => setActiveSubTab('responses')}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              ← Retour à la liste
            </button>
          </div>

          <form onSubmit={handleSaveDraft} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Épisode de prise en charge associé (optionnel)
              </label>
              <select
                value={selectedEpisodeId}
                onChange={(e) => setSelectedEpisodeId(e.target.value)}
                className="w-full max-w-md px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Aucun épisode associé</option>
                {episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.title || 'Épisode sans titre'} ({ep.status === 'active' ? 'Actif' : 'Clôturé'})
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Fields */}
            <div className="space-y-5 pt-4 border-t border-slate-100">
              {selectedTemplate.schemaJson?.fields?.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-800">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  {renderField(field)}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveSubTab('responses')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
              >
                {isPending ? 'Enregistrement...' : 'Enregistrer en brouillon'}
              </button>
              {currentEditingResponseId && (
                <button
                  type="button"
                  onClick={() => setConfirmFinalizeResponseId(currentEditingResponseId)}
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
                >
                  Finaliser et verrouiller
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Sub Tab: Templates List */}
      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-full uppercase">
                    {tpl.kind}
                  </span>
                  <span className="text-xs text-slate-400">
                    {tpl.schemaJson?.fields?.length || 0} champs
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 mb-1">{tpl.name}</h4>
                {tpl.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">{tpl.description}</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleStartNewResponse(tpl.id)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Remplir ce formulaire
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Finalize Modal */}
      {confirmFinalizeResponseId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              Finaliser et verrouiller le bilan ?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Cette action est <strong>définitive et irréversible</strong>. Une fois finalisé, le formulaire devient immuable et opposable sur le plan médico-légal.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmFinalizeResponseId(null)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleFinalizeSubmit}
                disabled={isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
              >
                {isPending ? 'Finalisation...' : 'Confirmer et verrouiller'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Template Modal */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Créer un modèle de formulaire clinique
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Définissez la structure de votre questionnaire ou bilan paramédical.
            </p>

            <form onSubmit={handleCreateTemplateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nom du modèle *
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Ex : Bilan initial podologique"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Type de formulaire *
                  </label>
                  <select
                    value={newTemplateKind}
                    onChange={(e) =>
                      setNewTemplateKind(e.target.value as ClinicalFormTemplateDTO['kind'])
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="evaluation">Évaluation / Bilan</option>
                    <option value="intake">Questionnaire d’accueil</option>
                    <option value="follow_up">Suivi régulier</option>
                    <option value="discharge">Fin de prise en charge</option>
                    <option value="satisfaction">Satisfaction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Description (optionnelle)
                  </label>
                  <input
                    type="text"
                    maxLength={1000}
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    placeholder="Courte description d’usage"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Schéma JSON des champs *
                </label>
                <textarea
                  rows={8}
                  required
                  value={newTemplateFieldsJson}
                  onChange={(e) => setNewTemplateFieldsJson(e.target.value)}
                  className="w-full font-mono text-[11px] p-3 bg-slate-900 text-emerald-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewTemplateModal(false)}
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
                  {isPending ? 'Création...' : 'Créer le modèle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
