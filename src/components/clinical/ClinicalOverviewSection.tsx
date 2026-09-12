'use client';

import React from 'react';
import {
  Activity,
  FileText,
  FolderOpen,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  UploadCloud,
  FileSpreadsheet,
} from 'lucide-react';
import type {
  ClinicalDocumentDTO,
  ClinicalMeasurementDTO,
} from '@/lib/clinical/types';

interface ClinicalOverviewSectionProps {
  overview: {
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
  };
  onNavigateTab: (tab: 'episodes' | 'timeline' | 'documents' | 'forms' | 'measurements') => void;
  onOpenNewEpisode?: () => void;
  onDownloadDocument?: (doc: ClinicalDocumentDTO) => void;
}

export default function ClinicalOverviewSection({
  overview,
  onNavigateTab,
  onOpenNewEpisode,
  onDownloadDocument,
}: ClinicalOverviewSectionProps) {
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

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Épisodes actifs
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <FolderOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {overview.activeEpisodesCount}
            </span>
            <span className="text-xs text-slate-500">
              / {overview.totalEpisodesCount} au total
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Formulaires en cours
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {overview.draftFormResponsesCount}
            </span>
            <span className="text-xs text-amber-600 font-medium">brouillons actifs</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Documents archivés
            </span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {overview.totalDocumentsCount}
            </span>
            <span className="text-xs text-slate-500">pièces jointes</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mesures suivies
            </span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {overview.recentMeasurements.length}
            </span>
            <span className="text-xs text-slate-500">récentes</span>
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Accès rapide au dossier clinique
            </h4>
            <p className="text-xs text-slate-600">
              Gérez les séances, bilans paramédicaux, documents et relevés de mesures.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenNewEpisode && (
            <button
              onClick={onOpenNewEpisode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvel épisode
            </button>
          )}
          <button
            onClick={() => onNavigateTab('documents')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg shadow-sm transition"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
            Ajouter un document
          </button>
          <button
            onClick={() => onNavigateTab('forms')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg shadow-sm transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
            Nouveau bilan / formulaire
          </button>
          <button
            onClick={() => onNavigateTab('measurements')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg shadow-sm transition"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            Relever une mesure
          </button>
        </div>
      </div>

      {/* Main Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Last Encounter & Last Note */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Dernière séance clinique
              </h3>
              <button
                onClick={() => onNavigateTab('episodes')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
              >
                Voir tout <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {overview.lastEncounter ? (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">
                    Séance du {formatDateTime(overview.lastEncounter.occurredAt)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Enregistrée
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 italic">
                Aucune séance clinique enregistrée pour ce patient.
              </p>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Dernière note finalisée
              </h4>
              {overview.lastFinalizedNote ? (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs">
                  <p className="text-slate-800 leading-relaxed italic">
                    « {overview.lastFinalizedNote.contentSnippet} »
                  </p>
                  {overview.lastFinalizedNote.finalizedAt && (
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Finalisée le {formatDateTime(overview.lastFinalizedNote.finalizedAt)}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Aucune note finalisée pour le moment.
                </p>
              )}
            </div>
          </div>

          {/* Recent Measurements */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                Dernières mesures
              </h3>
              <button
                onClick={() => onNavigateTab('measurements')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
              >
                Toutes les mesures <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {overview.recentMeasurements.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {overview.recentMeasurements.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{m.label}</div>
                      <div className="text-[11px] text-slate-500">
                        {formatDate(m.observedAt)} · Code : <span className="font-mono">{m.code}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">
                        {m.valueNumeric !== null ? m.valueNumeric : m.valueText}
                      </span>
                      {m.unit && <span className="text-slate-500 ml-1">{m.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 italic">
                Aucune mesure structurée relevée.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Recent Documents & Timeline Shortcut */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Documents récents
              </h3>
              <button
                onClick={() => onNavigateTab('documents')}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
              >
                Tous les documents <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {overview.recentDocuments.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {overview.recentDocuments.map((doc) => (
                  <div key={doc.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-slate-900 truncate">{doc.title}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span className="capitalize">{doc.category}</span>
                        <span>·</span>
                        <span>{formatDate(doc.createdAt)}</span>
                        <span>·</span>
                        <span>{(doc.sizeBytes / 1024).toFixed(0)} Ko</span>
                      </div>
                    </div>
                    {onDownloadDocument && (
                      <button
                        onClick={() => onDownloadDocument(doc)}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition whitespace-nowrap"
                      >
                        Télécharger
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 italic">
                Aucun document téléversé.
              </p>
            )}
          </div>

          {/* Timeline View Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Clock className="w-4 h-4" />
                Vue Chronologique
              </div>
              <h4 className="text-base font-bold text-white mb-2">
                Timeline Clinique Unifiée
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Consultez l’ensemble des événements (séances, notes, bilans, ordonnances, mesures) classés dans l’ordre antéchronologique.
              </p>
              <button
                onClick={() => onNavigateTab('timeline')}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-lg shadow transition"
              >
                Explorer la timeline
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
