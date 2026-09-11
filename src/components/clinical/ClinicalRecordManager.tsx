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
  Sparkles,
} from 'lucide-react';
import type {
  CareEpisodeDTO,
  ClinicalEncounterWithNotesDTO,
  ClinicalNoteDTO,
  EligibleAppointmentDTO,
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
} from '@/app/actions/clinical-record.actions';

interface ClinicalRecordManagerProps {
  patient: PatientProfileDTO;
  initialEpisodes: CareEpisodeDTO[];
  initialEncountersByEpisode: Record<string, ClinicalEncounterWithNotesDTO[]>;
  initialEligibleAppointments: EligibleAppointmentDTO[];
}

export default function ClinicalRecordManager({
  patient,
  initialEpisodes,
  initialEncountersByEpisode,
  initialEligibleAppointments,
}: ClinicalRecordManagerProps) {
  const router = useRouter();
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
  // Handlers
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
          err instanceof Error
            ? err.message
            : 'Erreur lors de la clôture de l’épisode. Finalisez les notes brouillon avant de clôturer.',
        );
      }
    });
  };

  const handleOpenNewEncounterModal = async (episodeId: string) => {
    setEncounterEpisodeId(episodeId);
    setEncounterOccurredAt(new Date().toISOString().slice(0, 16));
    setEncounterAppointmentId('');
    try {
      const freshAppts = await getEligibleAppointmentsAction(patient.id);
      setEligibleAppointments(freshAppts);
    } catch {
      // Ignored fallback
    }
    setShowNewEncounterModal(true);
  };

  const handleCreateEncounter = (e: React.FormEvent) => {
    e.preventDefault();
    clearNotifications();
    startTransition(async () => {
      try {
        const occurredIso = new Date(encounterOccurredAt).toISOString();
        const created = await createClinicalEncounterAction(patient.id, {
          careEpisodeId: encounterEpisodeId,
          occurredAt: occurredIso,
          appointmentId: encounterAppointmentId || null,
        });

        const newEncounterWithNotes: ClinicalEncounterWithNotesDTO = {
          ...created,
          notes: [],
        };

        setEncountersByEpisode((prev) => ({
          ...prev,
          [encounterEpisodeId]: [
            newEncounterWithNotes,
            ...(prev[encounterEpisodeId] || []),
          ],
        }));

        setShowNewEncounterModal(false);
        setSuccessMessage('Séance clinique ajoutée avec succès');
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erreur lors de la création de la séance',
        );
      }
    });
  };

  const handleCreateNote = (encounterId: string, e: React.FormEvent) => {
    e.preventDefault();
    clearNotifications();
    if (!newNoteContent.trim()) return;

    startTransition(async () => {
      try {
        const created = await createClinicalNoteAction(patient.id, {
          encounterId,
          content: newNoteContent.trim(),
        });

        setEncountersByEpisode((prev) => {
          const updated: Record<string, ClinicalEncounterWithNotesDTO[]> = {};
          for (const [epId, list] of Object.entries(prev)) {
            updated[epId] = list.map((enc) => {
              if (enc.id === encounterId) {
                return { ...enc, notes: [...enc.notes, created] };
              }
              return enc;
            });
          }
          return updated;
        });

        setNewNoteEncounterId(null);
        setNewNoteContent('');
        setSuccessMessage('Note brouillon enregistrée');
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erreur lors de l’ajout de la note',
        );
      }
    });
  };

  const handleUpdateDraftNote = (noteId: string, e: React.FormEvent) => {
    e.preventDefault();
    clearNotifications();
    if (!draftContent.trim()) return;

    startTransition(async () => {
      try {
        const updated = await updateDraftClinicalNoteAction(
          patient.id,
          noteId,
          draftContent.trim(),
        );

        setEncountersByEpisode((prev) => {
          const res: Record<string, ClinicalEncounterWithNotesDTO[]> = {};
          for (const [epId, list] of Object.entries(prev)) {
            res[epId] = list.map((enc) => ({
              ...enc,
              notes: enc.notes.map((n) => (n.id === noteId ? updated : n)),
            }));
          }
          return res;
        });

        setEditingDraftNoteId(null);
        setDraftContent('');
        setSuccessMessage('Brouillon mis à jour');
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erreur lors de la mise à jour',
        );
      }
    });
  };

  const handleFinalizeNote = (noteId: string) => {
    clearNotifications();
    startTransition(async () => {
      try {
        const finalized = await finalizeClinicalNoteAction(patient.id, { noteId });

        setEncountersByEpisode((prev) => {
          const res: Record<string, ClinicalEncounterWithNotesDTO[]> = {};
          for (const [epId, list] of Object.entries(prev)) {
            res[epId] = list.map((enc) => ({
              ...enc,
              notes: enc.notes.map((n) => (n.id === noteId ? finalized : n)),
            }));
          }
          return res;
        });

        setConfirmFinalizeNoteId(null);
        setEditingDraftNoteId(null);
        setSuccessMessage('Note clinique finalisée avec succès (lecture seule immuable)');
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erreur lors de la finalisation',
        );
      }
    });
  };

  const activeEpisode = episodes.find((ep) => ep.id === selectedEpisodeId) || episodes[0];
  const activeEncounters = activeEpisode
    ? encountersByEpisode[activeEpisode.id] || []
    : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/patients/${patient.id}`}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Retour au dossier administratif"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {displayName} {displayFirstName}
              </h1>
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
            </div>
            <p className="text-xs text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Dossier clinique sécurisé — Praticien traitant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewEpisodeModal(true)}
            disabled={!patient.isActive || isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvel épisode de prise en charge
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Action impossible</p>
            <p>{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs text-red-500 hover:underline"
          >
            Fermer
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-600 hover:underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Main Layout: Episodes Sidebar + Encounters Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Episodes List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-emerald-600" />
                Épisodes de soins ({episodes.length})
              </h2>
            </div>

            {episodes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                Aucun épisode de prise en charge ouvert pour ce patient.
              </div>
            ) : (
              <div className="space-y-2">
                {episodes.map((episode) => {
                  const isSelected = episode.id === selectedEpisodeId;
                  const countEncounters = (encountersByEpisode[episode.id] || []).length;
                  return (
                    <div
                      key={episode.id}
                      onClick={() => setSelectedEpisodeId(episode.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {episode.title || 'Épisode de soins sans titre'}
                        </span>
                        {episode.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
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
                        {encounter.notes.length === 0 && newNoteEncounterId !== encounter.id && (
                          <p className="text-xs text-gray-400 italic">
                            Aucune note pour cette séance.
                          </p>
                        )}

                        {encounter.notes.map((note) => {
                          const isEditing = editingDraftNoteId === note.id;
                          const isFinalized = note.status === 'finalized';

                          return (
                            <div
                              key={note.id}
                              className={`p-4 rounded-lg border text-sm ${
                                isFinalized
                                  ? 'bg-gray-50/70 border-gray-200'
                                  : 'bg-amber-50/40 border-amber-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {isFinalized ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-200 text-gray-800">
                                      <Lock className="w-3 h-3" />
                                      Finalisée
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                                      <Edit3 className="w-3 h-3" />
                                      Brouillon
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {isFinalized && note.finalizedAt
                                      ? `le ${formatDateTime(note.finalizedAt)}`
                                      : `créé le ${formatDateTime(note.createdAt)}`}
                                  </span>
                                </div>

                                {!isFinalized && activeEpisode.status === 'active' && !isEditing && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingDraftNoteId(note.id);
                                        setDraftContent(note.content);
                                      }}
                                      className="text-xs font-medium text-gray-700 hover:text-emerald-700"
                                    >
                                      Modifier
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmFinalizeNoteId(note.id)}
                                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                                    >
                                      Finaliser
                                    </button>
                                  </div>
                                )}
                              </div>

                              {isEditing ? (
                                <form
                                  onSubmit={(e) => handleUpdateDraftNote(note.id, e)}
                                  className="space-y-2 mt-2"
                                >
                                  <textarea
                                    value={draftContent}
                                    onChange={(e) => setDraftContent(e.target.value)}
                                    rows={4}
                                    maxLength={50000}
                                    className="w-full text-xs p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                    placeholder="Contenu de la note..."
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingDraftNoteId(null)}
                                      className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                      Annuler
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={isPending}
                                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                                    >
                                      Enregistrer
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                                  {note.content}
                                </div>
                              )}

                              {/* Confirmation alert for finalization */}
                              {confirmFinalizeNoteId === note.id && (
                                <div className="mt-3 p-3 rounded-lg bg-amber-100 border border-amber-300 text-xs text-amber-900 space-y-2">
                                  <p className="font-semibold flex items-center gap-1.5">
                                    <Lock className="w-4 h-4 text-amber-800" />
                                    Confirmation de finalisation immuable
                                  </p>
                                  <p>
                                    Une fois finalisée, cette note clinique ne pourra plus être modifiée ni supprimée. Confirmez-vous la finalisation ?
                                  </p>
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleFinalizeNote(note.id)}
                                      disabled={isPending}
                                      className="px-3 py-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded"
                                    >
                                      Oui, finaliser la note
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmFinalizeNoteId(null)}
                                      className="px-3 py-1 text-xs text-gray-700 hover:bg-amber-200/60 rounded"
                                    >
                                      Annuler
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add note inline form */}
                        {newNoteEncounterId === encounter.id && (
                          <form
                            onSubmit={(e) => handleCreateNote(encounter.id, e)}
                            className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-2"
                          >
                            <label className="block text-xs font-semibold text-emerald-900">
                              Nouvelle note clinique (texte brut)
                            </label>
                            <textarea
                              value={newNoteContent}
                              onChange={(e) => setNewNoteContent(e.target.value)}
                              rows={4}
                              maxLength={50000}
                              placeholder="Observations cliniques, suivi de séance..."
                              className="w-full text-xs p-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setNewNoteEncounterId(null)}
                                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                              >
                                Annuler
                              </button>
                              <button
                                type="submit"
                                disabled={isPending || !newNoteContent.trim()}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg"
                              >
                                Enregistrer le brouillon
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
              <FolderOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-medium text-gray-700">Aucun épisode sélectionné</p>
              <p className="text-xs text-gray-400 mt-1">
                Ouvrez un nouvel épisode de prise en charge pour commencer le suivi clinique.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Care Episode */}
      {showNewEpisodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-emerald-600" />
              Nouvel épisode de prise en charge
            </h3>
            <p className="text-xs text-gray-500">
              Un épisode regroupe l’ensemble des séances et notes pour un motif de consultation ou une période de soins.
            </p>
            <form onSubmit={handleCreateEpisode} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Intitulé de l’épisode (facultatif)
                </label>
                <input
                  type="text"
                  value={newEpisodeTitle}
                  onChange={(e) => setNewEpisodeTitle(e.target.value)}
                  maxLength={160}
                  placeholder="Ex : Rééducation cheville droite, Suivi..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEpisodeModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg"
                >
                  Ouvrir l’épisode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Clinical Encounter */}
      {showNewEncounterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Ajouter une séance clinique
            </h3>
            <form onSubmit={handleCreateEncounter} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date et heure réelle de la séance *
                </label>
                <input
                  type="datetime-local"
                  value={encounterOccurredAt}
                  onChange={(e) => setEncounterOccurredAt(e.target.value)}
                  max={new Date().toISOString().slice(0, 16)}
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Rendez-vous planifié associé (facultatif)
                </label>
                <select
                  value={encounterAppointmentId}
                  onChange={(e) => setEncounterAppointmentId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Sans rendez-vous associé</option>
                  {eligibleAppointments.map((appt) => (
                    <option key={appt.id} value={appt.id}>
                      {formatDateTime(appt.startsAt)} — {appt.appointmentTypeName}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Seuls les rendez-vous passés et non encore associés sont proposés.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEncounterModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg"
                >
                  Créer la séance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
