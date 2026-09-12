'use client';

import React, { useState, useRef, useTransition } from 'react';
import {
  Download,
  Archive,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Clock,
  Filter,
  Plus,
} from 'lucide-react';
import type {
  ClinicalDocumentDTO,
  CareEpisodeDTO,
  ClinicalDocumentCategory,
} from '@/lib/clinical/types';
import { CLINICAL_DOCUMENT_CATEGORIES } from '@/lib/clinical/types';

interface ClinicalDocumentsSectionProps {
  documents: ClinicalDocumentDTO[];
  episodes: CareEpisodeDTO[];
  onUpload: (formData: FormData) => Promise<void>;
  onArchive: (documentId: string) => Promise<void>;
  onDownload: (doc: ClinicalDocumentDTO) => Promise<void>;
}

const CATEGORY_LABELS: Record<ClinicalDocumentCategory, string> = {
  report: 'Compte-rendu',
  assessment: 'Bilan / Évaluation',
  prescription: 'Ordonnance / Prescription',
  referral: 'Courrier d’adressage',
  result: 'Résultat d’examen',
  consent: 'Consentement éclairé',
  correspondence: 'Courrier confrère',
  administrative: 'Document administratif',
  other: 'Autre document',
};

export default function ClinicalDocumentsSection({
  documents,
  episodes,
  onUpload,
  onArchive,
  onDownload,
}: ClinicalDocumentsSectionProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentCategory, setDocumentCategory] = useState<ClinicalDocumentCategory>('other');
  const [documentEpisodeId, setDocumentEpisodeId] = useState<string>('');

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocuments = documents.filter((doc) => {
    if (showArchived) {
      if (!doc.isArchived) return false;
    } else {
      if (doc.isArchived) return false;
    }
    if (filterCategory !== 'all' && doc.category !== filterCategory) {
      return false;
    }
    return true;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
      if (!documentTitle.trim()) {
        setDocumentTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Veuillez sélectionner un fichier');
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', documentTitle.trim() || selectedFile.name);
    formData.append('category', documentCategory);
    if (documentEpisodeId.trim()) {
      formData.append('careEpisodeId', documentEpisodeId.trim());
    }

    startTransition(async () => {
      try {
        await onUpload(formData);
        setShowUploadModal(false);
        setSelectedFile(null);
        setDocumentTitle('');
        setDocumentCategory('other');
        setDocumentEpisodeId('');
        setSuccessMessage('Document téléversé et chiffré avec succès');
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erreur lors du téléversement du document',
        );
      }
    });
  };

  const handleArchiveClick = (docId: string) => {
    if (!window.confirm('Voulez-vous archiver ce document clinique ?')) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      try {
        await onArchive(docId);
        setSuccessMessage('Document archivé');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur lors de l’archivage');
      }
    });
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

      {/* Header / Actions bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Toutes les catégories</option>
            {CLINICAL_DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              showArchived
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {showArchived ? 'Afficher les actifs' : 'Voir les archives'}
          </button>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Ajouter un document
        </button>
      </div>

      {/* Documents Grid / List */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
          <Paperclip className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium">
            {showArchived
              ? 'Aucun document archivé.'
              : 'Aucun document actif dans le dossier clinique.'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Téléversez des ordonnances, comptes-rendus, imageries ou courriers confrères.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className={`bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between transition ${
                doc.isArchived ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-full border border-blue-200">
                    {CATEGORY_LABELS[doc.category]}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {(doc.sizeBytes / 1024).toFixed(0)} Ko
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 line-clamp-2 mb-1">
                  {doc.title}
                </h4>
                <p className="text-xs text-slate-500 truncate mb-3">{doc.fileName}</p>

                <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-4">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Ajouté le {formatDate(doc.createdAt)}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onDownload(doc)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger
                </button>

                {!doc.isArchived && (
                  <button
                    onClick={() => handleArchiveClick(doc.id)}
                    disabled={isPending}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                    title="Archiver ce document"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Téléverser un document clinique
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Formats acceptés : PDF, JPEG, PNG, WEBP (max 10 Mo). Stockage privé et chiffré.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fichier *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Titre du document *
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="Ex : Ordonnance kiné post-opératoire"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catégorie *
                </label>
                <select
                  value={documentCategory}
                  onChange={(e) => setDocumentCategory(e.target.value as ClinicalDocumentCategory)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {CLINICAL_DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Épisode de prise en charge associé (optionnel)
                </label>
                <select
                  value={documentEpisodeId}
                  onChange={(e) => setDocumentEpisodeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Aucun épisode associé</option>
                  {episodes.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.title || 'Épisode sans titre'} ({ep.status === 'active' ? 'Actif' : 'Clôturé'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending || !selectedFile}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
                >
                  {isPending ? 'Téléversement...' : 'Téléverser le document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
