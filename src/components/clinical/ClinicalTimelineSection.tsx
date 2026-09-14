'use client';

import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  FileText,
  Paperclip,
  Activity,
  FileSpreadsheet,
  FolderOpen,
  FolderLock,
  Filter,
  Download,
  Lock,
} from 'lucide-react';
import type {
  ClinicalTimelineItem,
  ClinicalDocumentDTO,
} from '@/lib/clinical/types';

interface ClinicalTimelineSectionProps {
  timeline: ClinicalTimelineItem[];
  onDownloadDocument?: (doc: ClinicalDocumentDTO) => void;
}

export default function ClinicalTimelineSection({
  timeline,
  onDownloadDocument,
}: ClinicalTimelineSectionProps) {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredItems = useMemo(() => {
    return timeline.filter((item) => {
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesSubtitle = item.subtitle ? item.subtitle.toLowerCase().includes(query) : false;
        const matchesSnippet = item.snippet ? item.snippet.toLowerCase().includes(query) : false;
        return matchesTitle || matchesSubtitle || matchesSnippet;
      }
      return true;
    });
  }, [timeline, selectedType, searchQuery]);

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

  const getItemIcon = (type: ClinicalTimelineItem['type']) => {
    switch (type) {
      case 'episode_opened':
        return <FolderOpen className="w-4 h-4 text-emerald-600" />;
      case 'episode_closed':
        return <FolderLock className="w-4 h-4 text-slate-500" />;
      case 'encounter':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'note':
        return <FileText className="w-4 h-4 text-teal-600" />;
      case 'document':
        return <Paperclip className="w-4 h-4 text-blue-600" />;
      case 'form_response':
        return <FileSpreadsheet className="w-4 h-4 text-amber-600" />;
      case 'measurement':
        return <Activity className="w-4 h-4 text-rose-600" />;
    }
  };

  const getItemBadge = (item: ClinicalTimelineItem) => {
    switch (item.type) {
      case 'episode_opened':
        return (
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-full border border-emerald-200">
            Ouverture épisode
          </span>
        );
      case 'episode_closed':
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-full border border-slate-200">
            Clôture épisode
          </span>
        );
      case 'encounter':
        return (
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-full border border-indigo-200">
            Séance clinique
          </span>
        );
      case 'note':
        return (
          <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[11px] font-semibold rounded-full border border-teal-200 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Note
          </span>
        );
      case 'document':
        return (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-full border border-blue-200">
            Document ({item.category})
          </span>
        );
      case 'form_response':
        return (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-semibold rounded-full border border-amber-200">
            {item.status === 'finalized' ? 'Bilan finalisé' : 'Bilan brouillon'}
          </span>
        );
      case 'measurement':
        return (
          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[11px] font-semibold rounded-full border border-rose-200">
            Mesure structurée
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'all', label: 'Tout' },
              { key: 'encounter', label: 'Séances' },
              { key: 'note', label: 'Notes' },
              { key: 'document', label: 'Documents' },
              { key: 'form_response', label: 'Formulaires' },
              { key: 'measurement', label: 'Mesures' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedType(tab.key)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                  selectedType === tab.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <input
            type="text"
            placeholder="Filtrer les événements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-56"
          />
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium">Aucun événement clinique correspondant.</p>
          <p className="text-xs text-slate-400 mt-1">
            Les séances, notes, bilans, documents et mesures apparaîtront ici chronologiquement.
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pl-6 py-2">
          {filteredItems.map((item) => (
            <div key={`${item.type}-${item.id}`} className="relative group">
              {/* Timeline marker icon */}
              <div className="absolute -left-[35px] top-1 p-1.5 bg-white border-2 border-slate-200 rounded-full group-hover:border-emerald-500 transition shadow-xs">
                {getItemIcon(item.type)}
              </div>

              {/* Event Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getItemBadge(item)}
                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {formatDateTime(item.timestamp)}
                  </span>
                </div>

                {item.subtitle && (
                  <p className="text-xs text-slate-500 mb-2">{item.subtitle}</p>
                )}

                {item.snippet && (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-700 leading-relaxed font-sans">
                    {item.snippet}
                  </div>
                )}

                {/* Additional Specific Actions */}
                {item.type === 'document' && onDownloadDocument && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {item.fileName} {item.sizeBytes ? `(${(item.sizeBytes / 1024).toFixed(0)} Ko)` : ''}
                    </span>
                    <button
                      onClick={() =>
                        onDownloadDocument({
                          id: item.id,
                          organizationId: '',
                          patientId: '',
                          practitionerId: '',
                          careEpisodeId: null,
                          encounterId: null,
                          title: item.title,
                          category: item.category as ClinicalDocumentDTO['category'],
                          fileName: item.fileName || 'document',
                          mimeType: 'application/octet-stream',
                          sizeBytes: item.sizeBytes || 0,
                          storagePath: '',
                          patientVisible: false,
                          isArchived: false,
                          createdAt: item.timestamp,
                          updatedAt: item.timestamp,
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Télécharger
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
