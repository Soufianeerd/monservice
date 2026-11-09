'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Plus, Search, ShieldCheck, Wrench, X } from 'lucide-react';
import { createFieldServiceAssetAction } from '@/app/actions/field-service-assets.actions';
import {
  FIELD_SERVICE_ASSET_CATEGORIES,
  FIELD_SERVICE_ASSET_CATEGORY_LABELS,
  FIELD_SERVICE_ASSET_STATUSES,
  FIELD_SERVICE_ASSET_STATUS_LABELS,
  getWarrantyState,
  type FieldServiceAssetCategory,
  type FieldServiceAssetStatus,
} from '@/lib/workspaces/field-service/assets';
import { AssetStatusBadge, WarrantyBadge, formatDateFr } from './asset-badges';

export interface AssetListItem {
  id: string;
  clientId: string;
  category: FieldServiceAssetCategory;
  label: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  warrantyEndsOn: string | null;
  status: FieldServiceAssetStatus;
  clientName: string | null;
  siteLabel: string | null;
  siteCity: string | null;
  interventionCount: number;
  lastInterventionAt: string | null;
}

interface Props {
  today: string;
  metrics: { total: number; outOfService: number; warrantyExpiring: number };
  clients: { id: string; name: string }[];
  sites: { id: string; clientId: string; label: string; city: string }[];
  assets: AssetListItem[];
}

const inputClass =
  'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white';

export default function AssetsClient({ today, metrics, clients, sites, assets }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FieldServiceAssetStatus>('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | FieldServiceAssetCategory>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (clientFilter !== 'all' && a.clientId !== clientFilter) return false;
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      if (!q) return true;
      return [a.label, a.serialNumber, a.manufacturer, a.model, a.clientName, a.siteCity]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [assets, search, statusFilter, clientFilter, categoryFilter]);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6" data-testid="assets-page">
      <Link href="/operations" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Retour aux opérations
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Équipements clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            Le parc installé chez vos clients : garanties, numéros de série et historique des interventions.
          </p>
        </div>
        <button
          type="button"
          data-testid="new-asset-button"
          onClick={() => setIsFormOpen(true)}
          disabled={clients.length === 0}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvel équipement
        </button>
      </div>

      {clients.length === 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
          Créez d’abord un client : chaque équipement appartient à un client.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metric icon={Wrench} label="Équipements suivis" value={metrics.total} />
        <Metric icon={AlertTriangle} label="Hors service" value={metrics.outOfService} tone="rose" />
        <Metric icon={ShieldCheck} label="Garanties à échéance (60 j)" value={metrics.warrantyExpiring} tone="amber" />
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            aria-label="Rechercher un équipement"
            data-testid="asset-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Libellé, n° de série, marque, client, ville…"
            className={`${inputClass} pl-10`}
          />
        </div>
        <select aria-label="Filtrer par client" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className={`${inputClass} sm:w-48`}>
          <option value="all">Tous les clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select aria-label="Filtrer par catégorie" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as 'all' | FieldServiceAssetCategory)} className={`${inputClass} sm:w-52`}>
          <option value="all">Toutes catégories</option>
          {FIELD_SERVICE_ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{FIELD_SERVICE_ASSET_CATEGORY_LABELS[c]}</option>)}
        </select>
        <select aria-label="Filtrer par état" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | FieldServiceAssetStatus)} className={`${inputClass} sm:w-44`}>
          <option value="all">Tous les états</option>
          {FIELD_SERVICE_ASSET_STATUSES.map((s) => <option key={s} value={s}>{FIELD_SERVICE_ASSET_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-sm text-gray-500" data-testid="assets-empty">
          {assets.length === 0
            ? 'Aucun équipement enregistré. Ajoutez la chaudière, la climatisation ou le tableau électrique de vos clients pour suivre leurs interventions.'
            : 'Aucun équipement ne correspond à ces filtres.'}
        </div>
      ) : (
        <ul className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100" data-testid="assets-list">
          {filtered.map((a) => (
            <li key={a.id}>
              <Link href={`/operations/equipements/${a.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 hover:bg-gray-50" data-testid="asset-row">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{a.label}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {FIELD_SERVICE_ASSET_CATEGORY_LABELS[a.category]}
                    {(a.manufacturer || a.model) && ` · ${[a.manufacturer, a.model].filter(Boolean).join(' ')}`}
                    {a.serialNumber && ` · N° ${a.serialNumber}`}
                  </p>
                </div>
                <div className="text-sm text-gray-700 sm:w-56 truncate">
                  {a.clientName ?? '—'}
                  {a.siteLabel && <span className="block text-xs text-gray-500 truncate">{a.siteLabel}{a.siteCity ? ` · ${a.siteCity}` : ''}</span>}
                </div>
                <div className="text-xs text-gray-500 sm:w-40">
                  {a.interventionCount} intervention{a.interventionCount > 1 ? 's' : ''}
                  {a.lastInterventionAt && <span className="block">Dernière : {formatDateFr(a.lastInterventionAt)}</span>}
                </div>
                <div className="flex flex-wrap gap-2 sm:w-64 sm:justify-end">
                  <WarrantyBadge state={getWarrantyState(a.warrantyEndsOn, today)} endsOn={a.warrantyEndsOn} />
                  <AssetStatusBadge status={a.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isFormOpen && (
        <NewAssetDialog
          clients={clients}
          sites={sites}
          onClose={() => setIsFormOpen(false)}
          onCreated={(id) => router.push(`/operations/equipements/${id}`)}
        />
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone = 'gray' }: { icon: React.ElementType; label: string; value: number; tone?: 'gray' | 'rose' | 'amber' }) {
  const tones = { gray: 'bg-gray-100 text-gray-600', rose: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600' };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="w-5 h-5" /></span>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function NewAssetDialog({
  clients,
  sites,
  onClose,
  onCreated,
}: {
  clients: Props['clients'];
  sites: Props['sites'];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [siteId, setSiteId] = useState('');
  const [category, setCategory] = useState<FieldServiceAssetCategory>('heating');
  const [label, setLabel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [installedOn, setInstalledOn] = useState('');
  const [warrantyEndsOn, setWarrantyEndsOn] = useState('');
  const [notes, setNotes] = useState('');

  const clientSites = sites.filter((s) => s.clientId === clientId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createFieldServiceAssetAction({
        clientId,
        siteId: siteId || null,
        category,
        label,
        manufacturer: manufacturer || null,
        model: model || null,
        serialNumber: serialNumber || null,
        installedOn: installedOn || null,
        warrantyEndsOn: warrantyEndsOn || null,
        notes: notes || null,
      });
      if (result.ok) onCreated(result.data.id);
      else setError(result.error);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="new-asset-title">
      <form onSubmit={submit} className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-6 space-y-4" data-testid="new-asset-form">
        <div className="flex items-center justify-between">
          <h2 id="new-asset-title" className="text-lg font-bold text-gray-900">Nouvel équipement</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Client *">
            <select required value={clientId} onChange={(e) => { setClientId(e.target.value); setSiteId(''); }} className={inputClass} data-testid="asset-client-select">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Site d’installation">
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className={inputClass} data-testid="asset-site-select">
              <option value="">{clientSites.length ? 'Non précisé' : 'Aucun site pour ce client'}</option>
              {clientSites.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.city}</option>)}
            </select>
          </Field>
          <Field label="Catégorie *">
            <select required value={category} onChange={(e) => setCategory(e.target.value as FieldServiceAssetCategory)} className={inputClass} data-testid="asset-category-select">
              {FIELD_SERVICE_ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{FIELD_SERVICE_ASSET_CATEGORY_LABELS[c]}</option>)}
            </select>
          </Field>
          <Field label="Libellé *">
            <input required maxLength={160} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Chaudière gaz du sous-sol" className={inputClass} data-testid="asset-label-input" />
          </Field>
          <Field label="Marque">
            <input maxLength={120} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className={inputClass} data-testid="asset-manufacturer-input" />
          </Field>
          <Field label="Modèle">
            <input maxLength={120} value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} data-testid="asset-model-input" />
          </Field>
          <Field label="Numéro de série">
            <input maxLength={120} value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={inputClass} data-testid="asset-serial-input" />
          </Field>
          <Field label="Mise en service">
            <input type="date" value={installedOn} onChange={(e) => setInstalledOn(e.target.value)} className={inputClass} data-testid="asset-installed-input" />
          </Field>
          <Field label="Fin de garantie">
            <input type="date" value={warrantyEndsOn} min={installedOn || undefined} onChange={(e) => setWarrantyEndsOn(e.target.value)} className={inputClass} data-testid="asset-warranty-input" />
          </Field>
        </div>
        <Field label="Notes (accès, particularités…)">
          <textarea maxLength={4000} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </Field>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
          <button type="submit" disabled={isPending || !clientId || !label.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl" data-testid="asset-submit">
            {isPending ? 'Enregistrement…' : 'Enregistrer l’équipement'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
