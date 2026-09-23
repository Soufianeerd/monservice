'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building,
  MapPin,
  Calendar,
  AlertCircle,
  Plus,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { FieldServiceWorkspaceConfig } from '@/lib/workspaces/types';
import {
  createFieldServiceWorkOrderAction,
  createFieldServiceSiteAction,
} from '@/app/actions/field-service-operations.actions';

interface ClientItem {
  id: string;
  name: string;
}

interface SiteItem {
  id: string;
  clientId: string;
  label: string;
  city: string;
  addressLine1: string;
}

interface NewOperationFormProps {
  workspace: FieldServiceWorkspaceConfig;
  clients: ClientItem[];
  initialSites: SiteItem[];
}

export default function NewOperationForm({
  workspace,
  clients,
  initialSites,
}: NewOperationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [siteId, setSiteId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState<string>('intervention');
  const [priority, setPriority] = useState<string>('medium');
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');

  // New Site Modal State
  const [sites, setSites] = useState<SiteItem[]>(initialSites);
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [siteLoading, setSiteLoading] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [newSiteLabel, setNewSiteLabel] = useState('');
  const [newSiteAddress1, setNewSiteAddress1] = useState('');
  const [newSitePostalCode, setNewSitePostalCode] = useState('');
  const [newSiteCity, setNewSiteCity] = useState('');
  const [newSiteAccess, setNewSiteAccess] = useState('');

  const terminology = workspace.terminology;
  const workSingular = terminology.workSingular || 'Opération';

  const clientSites = sites.filter(s => s.clientId === clientId);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setSiteError('Veuillez sélectionner un client d’abord.');
      return;
    }
    setSiteLoading(true);
    setSiteError(null);

    try {
      const newSite = await createFieldServiceSiteAction({
        clientId,
        label: newSiteLabel,
        addressLine1: newSiteAddress1,
        postalCode: newSitePostalCode,
        city: newSiteCity,
        accessInstructions: newSiteAccess || null,
      });

      setSites(prev => [
        ...prev,
        {
          id: newSite.id,
          clientId: newSite.clientId,
          label: newSite.label,
          city: newSite.city,
          addressLine1: newSite.addressLine1,
        },
      ]);
      setSiteId(newSite.id);
      setIsSiteModalOpen(false);
      setNewSiteLabel('');
      setNewSiteAddress1('');
      setNewSitePostalCode('');
      setNewSiteCity('');
      setNewSiteAccess('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création du site';
      setSiteError(message);
    } finally {
      setSiteLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientId) {
      setError('Veuillez sélectionner un client.');
      return;
    }

    if (!title.trim()) {
      setError('Veuillez saisir un titre.');
      return;
    }

    startTransition(async () => {
      try {
        const order = await createFieldServiceWorkOrderAction({
          clientId,
          siteId: siteId || null,
          title: title.trim(),
          description: description.trim() || null,
          workType: workType as 'job' | 'intervention' | 'installation' | 'maintenance' | 'repair' | 'inspection' | 'project' | 'other',
          priority: priority as 'low' | 'medium' | 'high' | 'urgent',
          scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
          scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
        });

        router.push(`/operations/${order.id}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur lors de la création de l’opération';
        setError(message);
      }
    });
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/operations"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Retour aux {terminology.workPlural?.toLowerCase() || 'opérations'}
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="border-b border-gray-100 pb-5 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Nouveau {workSingular.toLowerCase()}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Renseignez les détails du {workSingular.toLowerCase()} pour votre client.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client & Site */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="clientSelect" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                Client *
              </label>
              <select
                id="clientSelect"
                data-testid="client-select"
                value={clientId}
                onChange={e => {
                  setClientId(e.target.value);
                  setSiteId('');
                }}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="" disabled>
                  Sélectionnez un client
                </option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="siteSelect" className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Site / Lieu d’intervention
                </label>
                <button
                  type="button"
                  data-testid="new-site-button"
                  onClick={() => setIsSiteModalOpen(true)}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nouveau site
                </button>
              </div>
              <select
                id="siteSelect"
                data-testid="site-select"
                value={siteId}
                onChange={e => setSiteId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">(Aucun site / En atelier)</option>
                {clientSites.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {s.city} ({s.addressLine1})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title & Work Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="sm:col-span-2">
              <label htmlFor="titleInput" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                Titre du {workSingular.toLowerCase()} *
              </label>
              <input
                type="text"
                id="titleInput"
                data-testid="title-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Rénovation salle de bain, Réparation chaudière..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label htmlFor="workTypeSelect" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                Type de travail
              </label>
              <select
                id="workTypeSelect"
                data-testid="work-type-select"
                value={workType}
                onChange={e => setWorkType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="intervention">Intervention</option>
                <option value="job">Chantier</option>
                <option value="installation">Installation</option>
                <option value="maintenance">Maintenance</option>
                <option value="repair">Réparation</option>
                <option value="inspection">Diagnostic / Inspection</option>
                <option value="project">Projet / Mission</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>

          {/* Priority & Scheduling */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label htmlFor="prioritySelect" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                Priorité
              </label>
              <select
                id="prioritySelect"
                data-testid="priority-select"
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="low">Basse</option>
                <option value="medium">Normale</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div>
              <label htmlFor="scheduledStartInput" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                Date / Heure de début
              </label>
              <input
                type="datetime-local"
                id="scheduledStartInput"
                data-testid="scheduled-start-input"
                value={scheduledStart}
                onChange={e => setScheduledStart(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="scheduledEndInput" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                Date / Heure de fin
              </label>
              <input
                type="datetime-local"
                id="scheduledEndInput"
                data-testid="scheduled-end-input"
                value={scheduledEnd}
                onChange={e => setScheduledEnd(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="descriptionInput" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
              Description & Notes de cadrage
            </label>
            <textarea
              id="descriptionInput"
              data-testid="description-input"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Détails des travaux à réaliser, matériel à prévoir, contraintes d'accès..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Link
              href="/operations"
              className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Annuler
            </Link>
            <button
              type="submit"
              data-testid="submit-operation-button"
              disabled={isPending}
              className="inline-flex items-center px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                `Créer le ${workSingular.toLowerCase()}`
              )}
            </button>
          </div>
        </form>
      </div>

      {/* New Site Modal */}
      {isSiteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-600" />
                Ajouter un nouveau site
              </h3>
              <button
                type="button"
                onClick={() => setIsSiteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {siteError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {siteError}
              </div>
            )}

            <form onSubmit={handleCreateSite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nom du site *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Résidence Principale, Chantier Bat A..."
                  value={newSiteLabel}
                  onChange={e => setNewSiteLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Adresse *
                </label>
                <input
                  type="text"
                  required
                  placeholder="12 rue des Artisans"
                  value={newSiteAddress1}
                  onChange={e => setNewSiteAddress1(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Code Postal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="75001"
                    value={newSitePostalCode}
                    onChange={e => setNewSitePostalCode(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Paris"
                    value={newSiteCity}
                    onChange={e => setNewSiteCity(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Instructions d’accès
                </label>
                <textarea
                  rows={2}
                  placeholder="Digicode, étage, accès cour..."
                  value={newSiteAccess}
                  onChange={e => setNewSiteAccess(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsSiteModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={siteLoading}
                  className="inline-flex items-center px-4 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  {siteLoading ? 'Enregistrement...' : 'Enregistrer le site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
