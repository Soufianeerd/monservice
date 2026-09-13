'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Lock,
  Plus,
  FileText,
  AlertCircle,
  FolderOpen,
  FolderLock,
  Edit3,
  UserCheck,
  UserX,
  Layers,
  Activity,
  FileSpreadsheet,
  Paperclip,
} from 'lucide-react';
import type {
  CareEpisodeDTO,
  ClinicalEncounterWithNotesDTO,
  EligibleAppointmentDTO,
  ClinicalDocumentDTO,
  ClinicalFormTemplateDTO,
  ClinicalFormResponseDTO,
  ClinicalMeasurementDTO,
  ClinicalTimelineItem,
  ClinicalFormAnswers,
  CreateClinicalMeasurementInput,
} from '@/lib/clinical/types';
import type { PatientProfileDTO } from '@/lib/patients/types';
import {
  createCareEpisodeAction,
  closeCareEpisodeAction,
  createClinicalEncounterAction,
  createClinicalNoteAction,
  updateDraftClinicalNoteAction,
  finalizeClinicalNoteAction,
  getEligibleAppointmentsAction,
  uploadClinicalDocumentAction,
  archiveClinicalDocumentAction,
  getClinicalDocumentDownloadUrlAction,
  createClinicalFormTemplateAction,
  createClinicalFormTemplateFromPresetAction,
  createClinicalFormResponseAction,
  updateDraftClinicalFormResponseAction,
  finalizeClinicalFormResponseAction,
  createClinicalMeasurementAction,
} from '@/app/actions/clinical-record.actions';
import type { ParamedicalProfessionPack } from '@/lib/workspaces/paramedical/profession-packs/types';

import ClinicalOverviewSection from './ClinicalOverviewSection';
import ClinicalTimelineSection from './ClinicalTimelineSection';
import ClinicalDocumentsSection from './ClinicalDocumentsSection';
import ClinicalFormsSection from './ClinicalFormsSection';
import ClinicalMeasurementsSection from './ClinicalMeasurementsSection';

interface ClinicalOverviewData {
  activeEpisodesCount: number;
  totalEpisodesCount: number;
  lastEncounter: {
    id: string;
    occurredAt: string;
    careEpisodeId: string;
  } | null;
  lastFinalizedNote: {
    id: string;
    contentSnippet: string;
    finalizedAt: string | null;
  } | null;
  recentDocuments: ClinicalDocumentDTO[];
  recentMeasurements: ClinicalMeasurementDTO[];
  draftFormResponsesCount: number;
  totalDocumentsCount: number;
}

interface ClinicalRecordManagerProps {
  patient: PatientProfileDTO;
  professionPack?: ParamedicalProfessionPack;
  initialEpisodes: CareEpisodeDTO[];
  initialEncountersByEpisode: Record<string, ClinicalEncounterWithNotesDTO[]>;
  initialEligibleAppointments: EligibleAppointmentDTO[];
  initialOverview: ClinicalOverviewData;
  initialTimeline: ClinicalTimelineItem[];
  initialDocuments: ClinicalDocumentDTO[];
  initialFormTemplates: ClinicalFormTemplateDTO[];
  initialFormResponses: ClinicalFormResponseDTO[];
  initialMeasurements: ClinicalMeasurementDTO[];
}

export type ClinicalTabKey =
  | 'overview'
  | 'episodes'
  | 'timeline'
  | 'documents'
  | 'forms'
  | 'measurements';

export default function ClinicalRecordManager({
  patient,
  professionPack,
  initialEpisodes,
  initialEncountersByEpisode,
  initialEligibleAppointments,
  initialOverview,
  initialTimeline,
  initialDocuments,
  initialFormTemplates,
  initialFormResponses,
  initialMeasurements,
}: ClinicalRecordManagerProps) {
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState<ClinicalTabKey>('overview');

  // Episodes & Encounters State
  const [episodes, setEpisodes] = useState<CareEpisodeDTO[]>(initialEpisodes);
  const [encountersByEpisode, setEncountersByEpisode] = useState<
    Record<string, ClinicalEncounterWithNotesDTO[]>
  >(initialEncountersByEpisode);
  const [eligibleAppointments, setEligibleAppointments] = useState<
    EligibleAppointmentDTO[]
  >(initialEligibleAppointments);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(
    episodes[0]?.id || null,
  );

  // Expansion State
  const [overview] = useState<ClinicalOverviewData>(initialOverview);
  const [timeline] = useState<ClinicalTimelineItem[]>(initialTimeline);
  const [documents, setDocuments] = useState<ClinicalDocumentDTO[]>(initialDocuments);
  const [formTemplates, setFormTemplates] =
    useState<ClinicalFormTemplateDTO[]>(initialFormTemplates);
  const [formResponses, setFormResponses] =
    useState<ClinicalFormResponseDTO[]>(initialFormResponses);
  const [measurements, setMeasurements] =
    useState<ClinicalMeasurementDTO[]>(initialMeasurements);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals / forms state
  const [showNewEpisodeModal, setShowNewEpisodeModal] = useState(false);
  const [newEpisodeTitle, setNewEpisodeTitle] = useState('');

  const [showNewEncounterModal, setShowNewEncounterModal] = useState(false);
  const [encounterEpisodeId, setEncounterEpisodeId] = useState<string>('');
  const [encounterOccurredAt, setEncounterOccurredAt] = useState<string>(
    new Date().toISOString().slice(0, 16),
  );
  const [encounterAppointmentId, setEncounterAppointmentId] = useState<string>('');

  const [newNoteEncounterId, setNewNoteEncounterId] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');

  const [editingDraftNoteId, setEditingDraftNoteId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');

  const [confirmFinalizeNoteId, setConfirmFinalizeNoteId] = useState<string | null>(null);
  const [confirmCloseEpisodeId, setConfirmCloseEpisodeId] = useState<string | null>(null);

  const displayName = patient.usedName || patient.birthName;
  const displayFirstName = patient.usedFirstName || patient.firstBirthName;

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

  const clearNotifications = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // ==========================================
  // Handlers : Episodes, Encounters & Notes
  // ==========================================

  const handleCreateEpisode = (e: React.FormEvent) => {
    e.preventDefault();
    clearNotifications();
    startTransition(async () => {
      try {
        const created = await createCareEpisodeAction(patient.id, {
          title: newEpisodeTitle.trim() || null,
        });
        setEpisodes((prev) => [created, ...prev]);
        setEncountersByEpisode((prev) => ({ ...prev, [created.id]: [] }));
        setSelectedEpisodeId(created.id);
        setShowNewEpisodeModal(false);
        setNewEpisodeTitle('');
        setSuccessMessage('Épisode de prise en charge ouvert avec succès');
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erreur lors de la création de l’épisode',
        );
      }
    });
  };

  const handleCloseEpisode = (episodeId: string) => {
    clearNotifications();
    startTransition(async () => {
      try {
        const updated = await closeCareEpisodeAction(patient.id, { episodeId });
        setEpisodes((prev) =>
          prev.map((ep) => (ep.id === updated.id ? updated : ep)),
        );
        setConfirmCloseEpisodeId(null);
        setSuccessMessage('Épisode de prise en charge clôturé avec succès');
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erreur lors de la clôture de l’épisode',
        );
      }
    });
  };

  const handleOpenNewEncounterModal = async (episodeId: string) => {
    setEncounterEpisodeId(episodeId);
    setEncounterOccurredAt(new Date().toISOString().slice(0, 16));
    setEncounterAppointmentId('');
    try {
      const eligible = await getEligibleAppointmentsAction(patient.id);
      setEligibleAppointments(eligible);
    } catch {
      // Ignorer ou conserver la liste initiale
    }
    setShowNewEncounterModal(true);
  };

  const handleCreateEncounter = (e: React.FormEvent) => {
    e.preventDefault();
    clearNotifications();
    startTransition(async () => {
      try {
        const created = await createClinicalEncounterAction(patient.id, {
          careEpisodeId: encounterEpisodeId,
          occurredAt: new Date(encounterOccurredAt).toISOString(),
          appointmentId: encounterAppointmentId ? encounterAppointmentId : null,
        });

        setEncountersByEpisode((prev) => {
          const list = prev[created.careEpisodeId] || [];
          return {
            ...prev,
            [created.careEpisodeId]: [{ ...created, notes: [] }, ...list],
          };
        });

        setShowNewEncounterModal(false);
        setSuccessMessage('Séance clinique enregistrée avec succès');
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erreur lors de la création de la séance',
        );
      }
    });
  };

  const handleCreateNote = (encounterId: string, episodeId: string) => {
    if (!newNoteContent.trim()) return;
    clearNotifications();
    startTransition(async () => {
      try {
        const created = await createClinicalNoteAction(patient.id, {
          encounterId,
          content: newNoteContent.trim(),
        });

        setEncountersByEpisode((prev) => {
          const list = prev[episodeId] || [];
          return {
            ...prev,
            [episodeId]: list.map((enc) => {
              if (enc.id !== encounterId) return enc;
              return {
                ...enc,
                notes: [...enc.notes, created],
              };
            }),
          };
        });

        setNewNoteEncounterId(null);
        setNewNoteContent('');
        setSuccessMessage('Note de suivi créée (brouillon)');
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erreur lors de la création de la note',
        );
      }
    });
  };

  const handleUpdateDraftNote = (
    noteId: string,
    encounterId: string,
    episodeId: string,
  ) => {
    if (!draftContent.trim()) return;
    clearNotifications();
    startTransition(async () => {
      try {
        const updated = await updateDraftClinicalNoteAction(patient.id, noteId, {
          content: draftContent.trim(),
        });

        setEncountersByEpisode((prev) => {
          const list = prev[episodeId] || [];
          return {
            ...prev,
            [episodeId]: list.map((enc) => {
              if (enc.id !== encounterId) return enc;
              return {
                ...enc,
                notes: enc.notes.map((n) => (n.id === noteId ? updated : n)),
              };
            }),
          };
        });

        setEditingDraftNoteId(null);
        setDraftContent('');
        setSuccessMessage('Note modifiée avec succès');
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erreur lors de la modification de la note',
        );
      }
    });
  };

  const handleFinalizeNote = (
    noteId: string,
    encounterId: string,
    episodeId: string,
  ) => {
    clearNotifications();
    startTransition(async () => {
      try {
        const finalized = await finalizeClinicalNoteAction(patient.id, { noteId });

        setEncountersByEpisode((prev) => {
          const list = prev[episodeId] || [];
          return {
            ...prev,
            [episodeId]: list.map((enc) => {
              if (enc.id !== encounterId) return enc;
              return {
                ...enc,
                notes: enc.notes.map((n) => (n.id === noteId ? finalized : n)),
              };
            }),
          };
        });

        setConfirmFinalizeNoteId(null);
        setSuccessMessage('Note clinique validée et verrouillée définitivement');
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erreur lors de la finalisation de la note',
        );
      }
    });
  };

  // ==========================================
  // Handlers : Documents
  // ==========================================

  const handleUploadDocument = async (formData: FormData) => {
    const doc = await uploadClinicalDocumentAction(patient.id, formData);
    setDocuments((prev) => [doc, ...prev]);
    router.refresh();
  };

  const handleArchiveDocument = async (documentId: string) => {
    const updated = await archiveClinicalDocumentAction(patient.id, documentId);
    setDocuments((prev) => prev.map((d) => (d.id === documentId ? updated : d)));
    router.refresh();
  };

  const handleDownloadDocument = async (doc: ClinicalDocumentDTO) => {
    const { downloadUrl } = await getClinicalDocumentDownloadUrlAction(patient.id, doc.id);
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
  };

  // ==========================================
  // Handlers : Forms & Questionnaires
  // ==========================================

  const handleCreateTemplate = async (input: {
    name: string;
    kind: ClinicalFormTemplateDTO['kind'];
    description?: string;
    schemaJson: Record<string, unknown>;
  }) => {
    const tpl = await createClinicalFormTemplateAction(input);
    setFormTemplates((prev) => [tpl, ...prev]);
    router.refresh();
  };

  const handleInstallTemplatePreset = async (presetId: string) => {
    const tpl = await createClinicalFormTemplateFromPresetAction(presetId, patient.id);
    setFormTemplates((prev) => {
      const exists = prev.some((t) => t.id === tpl.id);
      if (exists) {
        return prev.map((t) => (t.id === tpl.id ? tpl : t));
      }
      return [tpl, ...prev];
    });
    router.refresh();
  };

  const handleCreateFormResponse = async (
    templateId: string,
    careEpisodeId: string | null,
    answers: ClinicalFormAnswers,
  ) => {
    const resp = await createClinicalFormResponseAction(patient.id, {
      templateId,
      careEpisodeId,
      answersJson: answers,
    });
    setFormResponses((prev) => [resp, ...prev]);
    router.refresh();
  };

  const handleUpdateDraftFormResponse = async (
    responseId: string,
    answers: ClinicalFormAnswers,
  ) => {
    const resp = await updateDraftClinicalFormResponseAction(patient.id, {
      responseId,
      answersJson: answers,
    });
    setFormResponses((prev) => prev.map((r) => (r.id === responseId ? resp : r)));
    router.refresh();
  };

  const handleFinalizeFormResponse = async (
    responseId: string,
    answers?: ClinicalFormAnswers,
  ) => {
    const resp = await finalizeClinicalFormResponseAction(patient.id, {
      responseId,
      answersJson: answers,
    });
    setFormResponses((prev) => prev.map((r) => (r.id === responseId ? resp : r)));
    router.refresh();
  };

  // ==========================================
  // Handlers : Measurements
  // ==========================================

  const handleCreateMeasurement = async (input: CreateClinicalMeasurementInput) => {
    const m = await createClinicalMeasurementAction(patient.id, input);
    setMeasurements((prev) => [m, ...prev]);
    router.refresh();
  };

  const activeEpisode = episodes.find((ep) => ep.id === selectedEpisodeId) || episodes[0];
  const activeEncounters = activeEpisode
    ? encountersByEpisode[activeEpisode.id] || []
    : [];

  return (
    <div className="space-y-6">
      {/* Patient Header Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href={`/patients/${patient.id}`}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Retour à la fiche administrative"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                {displayName} {displayFirstName}
              </h1>
              {patient.isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <UserCheck className="w-3.5 h-3.5" />
                  Actif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                  <UserX className="w-3.5 h-3.5" />
                  Archivé
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span>Né(e) le : {formatDate(patient.birthDate)}</span>
              <span>{professionPack?.clinicalHeaderTitle || 'Dossier de suivi clinique paramédical'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/patients/${patient.id}`}
              className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition"
            >
              Fiche administrative
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-2">
          {[
            { key: 'overview', label: 'Vue d’ensemble', icon: Layers },
            { key: 'episodes', label: 'Épisodes & Séances', icon: FolderOpen },
            { key: 'timeline', label: 'Timeline clinique', icon: Clock },
            { key: 'documents', label: 'Documents', icon: Paperclip },
            { key: 'forms', label: 'Bilans & Formulaires', icon: FileSpreadsheet },
            { key: 'measurements', label: 'Mesures & Constantes', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  clearNotifications();
                  setActiveTab(tab.key as ClinicalTabKey);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Notifications */}
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

      {/* TAB CONTENT */}

      {/* 1. VUE D'ENSEMBLE */}
      {activeTab === 'overview' && (
        <ClinicalOverviewSection
          overview={overview}
          onNavigateTab={(tab) => {
            clearNotifications();
            setActiveTab(tab);
          }}
          onOpenNewEpisode={() => setShowNewEpisodeModal(true)}
          onDownloadDocument={handleDownloadDocument}
        />
      )}

      {/* 2. ÉPISODES & SÉANCES */}
      {activeTab === 'episodes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Episodes List */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-emerald-600" />
                  Épisodes de soins
                </h2>
                <button
                  type="button"
                  onClick={() => setShowNewEpisodeModal(true)}
                  disabled={!patient.isActive || isPending}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ouvrir un épisode
                </button>
              </div>

              {episodes.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">
                  <p>Aucun épisode de soins ouvert pour ce patient.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {episodes.map((episode) => {
                    const isSelected = selectedEpisodeId === episode.id;
                    const countEncounters = (encountersByEpisode[episode.id] || []).length;
                    return (
                      <div
                        key={episode.id}
                        onClick={() => setSelectedEpisodeId(episode.id)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/50 border-emerald-500 shadow-xs'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-gray-900 truncate">
                            {episode.title || 'Épisode sans titre'}
                          </span>
                          {episode.status === 'active' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                              Actif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                              <FolderLock className="w-3 h-3" />
                              Clôturé
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                          <span>Ouvert le {formatDate(episode.startedAt)}</span>
                          <span>{countEncounters} séance(s)</span>
                        </div>
                        {episode.closedAt && (
                          <div className="mt-1 text-[11px] text-gray-400">
                            Clôturé le {formatDate(episode.closedAt)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Encounters & Notes */}
          <div className="lg:col-span-8 space-y-6">
            {activeEpisode ? (
              <div className="space-y-6">
                {/* Episode Header Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">
                        {activeEpisode.title || 'Épisode de soins'}
                      </h2>
                      {activeEpisode.status === 'active' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Clôturé (lecture seule)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Prise en charge débutée le {formatDate(activeEpisode.startedAt)}
                      {activeEpisode.closedAt &&
                        ` — Clôturée le ${formatDate(activeEpisode.closedAt)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeEpisode.status === 'active' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenNewEncounterModal(activeEpisode.id)}
                          disabled={!patient.isActive || isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Ajouter une séance
                        </button>

                        {confirmCloseEpisodeId === activeEpisode.id ? (
                          <div className="flex items-center gap-1.5 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                            <span className="text-[11px] text-amber-800 font-medium">
                              Confirmer la clôture ?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCloseEpisode(activeEpisode.id)}
                              disabled={isPending}
                              className="px-2 py-0.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded"
                            >
                              Oui
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmCloseEpisodeId(null)}
                              className="px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmCloseEpisodeId(activeEpisode.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <FolderLock className="w-3.5 h-3.5" />
                            Clôturer l’épisode
                          </button>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Encounters Feed */}
                <div className="space-y-4">
                  {activeEncounters.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
                      <p className="font-medium">Aucune séance clinique enregistrée</p>
                      {activeEpisode.status === 'active' && (
                        <p className="text-xs text-gray-400 mt-1">
                          Cliquez sur « Ajouter une séance » pour consigner une rencontre et des notes de suivi.
                        </p>
                      )}
                    </div>
                  ) : (
                    activeEncounters.map((encounter) => (
                      <div
                        key={encounter.id}
                        className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
                      >
                        {/* Encounter Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-semibold text-gray-900">
                              Séance du {formatDateTime(encounter.occurredAt)}
                            </span>
                            {encounter.appointmentId && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                <Calendar className="w-3 h-3" />
                                Rendez-vous associé
                              </span>
                            )}
                          </div>

                          {activeEpisode.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewNoteEncounterId(encounter.id);
                                setNewNoteContent('');
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                            >
                              <Plus className="w-3 h-3" />
                              Ajouter une note
                            </button>
                          )}
                        </div>

                        {/* Notes list */}
                        <div className="space-y-3">
                          {encounter.notes.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">
                              Aucune note clinique pour cette séance.
                            </p>
                          ) : (
                            encounter.notes.map((note) => (
                              <div
                                key={note.id}
                                className={`p-4 rounded-lg border text-xs space-y-2 ${
                                  note.status === 'finalized'
                                    ? 'bg-gray-50/70 border-gray-200'
                                    : 'bg-amber-50/30 border-amber-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                                    <span>
                                      {note.status === 'finalized'
                                        ? 'Note finalisée'
                                        : 'Brouillon en cours'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {note.status === 'finalized' ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                                        <Lock className="w-3 h-3 text-gray-400" />
                                        Verrouillée le {formatDateTime(note.finalizedAt!)}
                                      </span>
                                    ) : (
                                      <>
                                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded">
                                          Brouillon modifiable
                                        </span>
                                        {activeEpisode.status === 'active' && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingDraftNoteId(note.id);
                                                setDraftContent(note.content);
                                              }}
                                              className="text-gray-600 hover:text-gray-900 p-1 rounded"
                                              title="Modifier le brouillon"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setConfirmFinalizeNoteId(note.id)}
                                              className="text-emerald-700 hover:text-emerald-800 p-1 rounded"
                                              title="Finaliser définitivement"
                                            >
                                              <CheckCircle2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>

                                {editingDraftNoteId === note.id ? (
                                  <div className="space-y-2 pt-2">
                                    <textarea
                                      rows={4}
                                      value={draftContent}
                                      onChange={(e) => setDraftContent(e.target.value)}
                                      className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setEditingDraftNoteId(null)}
                                        className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                                      >
                                        Annuler
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdateDraftNote(
                                            note.id,
                                            encounter.id,
                                            activeEpisode.id,
                                          )
                                        }
                                        disabled={isPending}
                                        className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded"
                                      >
                                        Enregistrer
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                    {note.content}
                                  </p>
                                )}

                                {confirmFinalizeNoteId === note.id && (
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2 mt-2">
                                    <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                                      <AlertCircle className="w-4 h-4 text-amber-600" />
                                      Confirmation de finalisation
                                    </div>
                                    <p className="text-amber-700 text-[11px]">
                                      Attention : la finalisation est <strong>irréversible</strong>. Cette note deviendra immuable et opposable sur le plan médico-légal.
                                    </p>
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setConfirmFinalizeNoteId(null)}
                                        className="px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
                                      >
                                        Annuler
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleFinalizeNote(
                                            note.id,
                                            encounter.id,
                                            activeEpisode.id,
                                          )
                                        }
                                        disabled={isPending}
                                        className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded"
                                      >
                                        Confirmer et verrouiller
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}

                          {/* New Note Form */}
                          {newNoteEncounterId === encounter.id && (
                            <div className="p-4 rounded-lg border border-emerald-300 bg-emerald-50/30 space-y-3">
                              <label className="block text-xs font-semibold text-gray-800">
                                Nouvelle note d'évolution / observation clinique :
                              </label>
                              <textarea
                                rows={4}
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                placeholder="Observations, bilans, traitements appliqués, consignes..."
                                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setNewNoteEncounterId(null)}
                                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCreateNote(encounter.id, activeEpisode.id)
                                  }
                                  disabled={isPending || !newNoteContent.trim()}
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                                >
                                  Enregistrer la note
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
                <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold">Aucun épisode sélectionné</p>
                <p className="text-xs text-gray-400 mt-1">
                  Sélectionnez ou créez un épisode de soins pour consulter ou ajouter des séances et notes cliniques.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. TIMELINE CLINIQUE UNIFIÉE */}
      {activeTab === 'timeline' && (
        <ClinicalTimelineSection
          timeline={timeline}
          onDownloadDocument={handleDownloadDocument}
        />
      )}

      {/* 4. DOCUMENTS */}
      {activeTab === 'documents' && (
        <ClinicalDocumentsSection
          documents={documents}
          episodes={episodes}
          onUpload={handleUploadDocument}
          onArchive={handleArchiveDocument}
          onDownload={handleDownloadDocument}
        />
      )}

      {/* 5. FORMULAIRES & BILANS */}
      {activeTab === 'forms' && (
        <ClinicalFormsSection
          templates={formTemplates}
          responses={formResponses}
          episodes={episodes}
          professionPack={professionPack}
          onCreateTemplate={handleCreateTemplate}
          onInstallTemplatePreset={handleInstallTemplatePreset}
          onCreateResponse={handleCreateFormResponse}
          onUpdateDraftResponse={handleUpdateDraftFormResponse}
          onFinalizeResponse={handleFinalizeFormResponse}
        />
      )}

      {/* 6. MESURES & CONSTANTES */}
      {activeTab === 'measurements' && (
        <ClinicalMeasurementsSection
          measurements={measurements}
          episodes={episodes}
          professionPack={professionPack}
          onCreateMeasurement={handleCreateMeasurement}
        />
      )}

      {/* Modal: New Care Episode */}
      {showNewEpisodeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Ouvrir un nouvel épisode de prise en charge
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Définit le cadre de la prise en charge clinique pour ce patient.
            </p>

            <form onSubmit={handleCreateEpisode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Intitulé de l'épisode (optionnel)
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={newEpisodeTitle}
                  onChange={(e) => setNewEpisodeTitle(e.target.value)}
                  placeholder="Ex : Rééducation épaule droite post-opératoire"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEpisodeModal(false)}
                  disabled={isPending}
                  className="px-3.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isPending ? 'Création...' : 'Ouvrir l’épisode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Clinical Encounter */}
      {showNewEncounterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Ajouter une séance clinique
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Consignez la rencontre effective avec le patient.
            </p>

            <form onSubmit={handleCreateEncounter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date et heure de la séance *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={encounterOccurredAt}
                  onChange={(e) => setEncounterOccurredAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Rendez-vous associé (optionnel)
                </label>
                <select
                  value={encounterAppointmentId}
                  onChange={(e) => setEncounterAppointmentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Séance libre sans rendez-vous préalable</option>
                  {eligibleAppointments.map((appt) => (
                    <option key={appt.id} value={appt.id}>
                      {formatDateTime(appt.startsAt)} — {appt.appointmentTypeName}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Seuls les rendez-vous passés (scheduled) non encore associés apparaissent ici.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEncounterModal(false)}
                  disabled={isPending}
                  className="px-3.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isPending ? 'Enregistrement...' : 'Enregistrer la séance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
