'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CalendarClock, ClipboardList, MapPin, Pencil, QrCode, User } from 'lucide-react';
import { scheduleAssetMaintenanceAction, updateFieldServiceAssetAction } from '@/app/actions/field-service-assets.actions';
import {
  FIELD_SERVICE_ASSET_CATEGORIES,
  FIELD_SERVICE_ASSET_CATEGORY_LABELS,
  MAINTENANCE_INTERVAL_OPTIONS,
  getMaintenanceState,
  getWarrantyState,
  type FieldServiceAssetCategory,
  type FieldServiceAssetStatus,
} from '@/lib/workspaces/field-service/assets';
import { AssetStatusBadge, MaintenanceBadge, WarrantyBadge, formatDateFr, intervalLabel } from '../asset-badges';

interface Intervention {
  workOrderId: string;
  reference: string;
  title: string;
  workType: string;
  status: string;
  date: string;
  reportSummary: string | null;
}

interface AssetDetail {
  id: string;
  clientId: string;
  siteId: string | null;
  category: FieldServiceAssetCategory;
  label: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  installedOn: string | null;
  warrantyEndsOn: string | null;
  status: FieldServiceAssetStatus;
  notes: string | null;
  maintenanceIntervalMonths: number | null;
  nextMaintenanceOn: string | null;
  clientName: string | null;
  siteLabel: string | null;
  siteAddressLine1: string | null;
  sitePostalCode: string | null;
  siteCity: string | null;
  interventions: Intervention[];
}

const workOrderStatusLabels: Record<string, string> = {
  draft: 'Brouillon', scheduled: 'Planifiée', in_progress: 'En cours', paused: 'En pause', completed: 'Terminée', cancelled: 'Annulée',
};
const workTypeLabels: Record<string, string> = {
  job: 'Chantier', intervention: 'Intervention', installation: 'Installation', maintenance: 'Entretien',
  repair: 'Dépannage', inspection: 'Contrôle', project: 'Projet', other: 'Autre',
};

const inputClass =
  'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white';

export default function AssetDetailClient({ asset, sites, today }: { asset: AssetDetail; sites: { id: string; label: string; city: string }[]; today: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const readOnly = asset.status === 'decommissioned';

  const save = (payload: Record<string, unknown>, onDone?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await updateFieldServiceAssetAction({ id: asset.id, ...payload });
      if (!result.ok) { setError(result.error); return; }
      onDone?.();
      router.refresh();
    });
  };

  const planMaintenance = () => {
    setError(null);
    startTransition(async () => {
      const result = await scheduleAssetMaintenanceAction({ assetId: asset.id });
      if (!result.ok) { setError(result.error); return; }
      router.push(`/operations/${result.data.workOrderId}`);
    });
  };

  const changeStatus = (status: FieldServiceAssetStatus) => {
    if (status === 'decommissioned' && !window.confirm('Retirer définitivement cet équipement ? Sa fiche et son historique resteront consultables mais ne pourront plus être modifiés.')) return;
    save({ status });
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6" data-testid="asset-detail">
      <Link href="/operations/equipements" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Retour aux équipements
      </Link>

      {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{FIELD_SERVICE_ASSET_CATEGORY_LABELS[asset.category]}</p>
            <h1 className="text-2xl font-bold text-gray-900 break-words" data-testid="asset-title">{asset.label}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <AssetStatusBadge status={asset.status} />
              <WarrantyBadge state={getWarrantyState(asset.warrantyEndsOn, today)} endsOn={asset.warrantyEndsOn} />
              {!readOnly && <MaintenanceBadge state={getMaintenanceState(asset.nextMaintenanceOn, today)} nextOn={asset.nextMaintenanceOn} />}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/operations/equipements/${asset.id}/etiquette`} className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl" data-testid="asset-label-link">
              <QrCode className="w-4 h-4 mr-1.5" />Étiquette QR
            </Link>
          {!readOnly && (
            <>
              <button type="button" onClick={() => setIsEditing((v) => !v)} className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl" data-testid="asset-edit-toggle">
                <Pencil className="w-4 h-4 mr-1.5" />{isEditing ? 'Fermer' : 'Modifier'}
              </button>
              {asset.status === 'active' ? (
                <button type="button" disabled={isPending} onClick={() => changeStatus('out_of_service')} className="px-3 py-2 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl" data-testid="asset-mark-out-of-service">
                  Déclarer hors service
                </button>
              ) : (
                <button type="button" disabled={isPending} onClick={() => changeStatus('active')} className="px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl" data-testid="asset-mark-active">
                  Remettre en service
                </button>
              )}
              <button type="button" disabled={isPending} onClick={() => changeStatus('decommissioned')} className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl" data-testid="asset-decommission">
                Retirer du parc
              </button>
            </>
          )}
          </div>
        </div>

        {readOnly && (
          <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-3">
            Équipement retiré du parc : la fiche et l’historique sont conservés en lecture seule.
          </p>
        )}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Info icon={User} label="Client" value={asset.clientName ?? '—'} />
          <Info icon={MapPin} label="Site" value={asset.siteLabel ? `${asset.siteLabel} — ${[asset.siteAddressLine1, asset.sitePostalCode, asset.siteCity].filter(Boolean).join(' ')}` : 'Non précisé'} />
          <Info label="Marque / modèle" value={[asset.manufacturer, asset.model].filter(Boolean).join(' ') || '—'} />
          <Info label="Numéro de série" value={asset.serialNumber ?? '—'} />
          <Info icon={Calendar} label="Mise en service" value={formatDateFr(asset.installedOn)} />
          <Info icon={Calendar} label="Fin de garantie" value={formatDateFr(asset.warrantyEndsOn)} />
        </dl>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 pt-4" data-testid="asset-maintenance">
          <div className="text-sm">
            <p className="font-medium text-gray-900 flex items-center"><CalendarClock className="w-4 h-4 mr-1.5 text-gray-400" />Entretien périodique : {intervalLabel(asset.maintenanceIntervalMonths)}</p>
            <p className="text-gray-600">
              Prochain entretien : <span data-testid="asset-next-maintenance">{formatDateFr(asset.nextMaintenanceOn)}</span>
              {asset.maintenanceIntervalMonths ? ' · recalculé à la clôture de chaque opération d’entretien rattachée' : ''}
            </p>
          </div>
          {!readOnly && (
            <button type="button" disabled={isPending} onClick={planMaintenance} className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl" data-testid="asset-plan-maintenance">
              Planifier l’entretien
            </button>
          )}
        </div>
        {asset.notes && <p className="text-sm text-gray-700 whitespace-pre-line border-t border-gray-100 pt-3">{asset.notes}</p>}

        {isEditing && !readOnly && (
          <EditAssetForm asset={asset} sites={sites} isPending={isPending} onSave={(payload) => save(payload, () => setIsEditing(false))} />
        )}
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4" data-testid="asset-history">
        <h2 className="text-lg font-bold text-gray-900 flex items-center"><ClipboardList className="w-5 h-5 mr-2 text-gray-400" />Historique des interventions</h2>
        {asset.interventions.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune intervention rattachée. Depuis la fiche d’une opération de ce client, ajoutez cet équipement dans « Équipements concernés ».
          </p>
        ) : (
          <ol className="relative border-l border-gray-200 ml-2 space-y-5">
            {asset.interventions.map((i) => (
              <li key={i.workOrderId} className="ml-4">
                <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-primary-500 border-2 border-white" />
                <p className="text-xs text-gray-500">{formatDateFr(i.date)} · {workTypeLabels[i.workType] ?? i.workType} · {workOrderStatusLabels[i.status] ?? i.status}</p>
                <Link href={`/operations/${i.workOrderId}`} className="font-semibold text-gray-900 hover:text-primary-700">
                  {i.reference} — {i.title}
                </Link>
                {i.reportSummary && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{i.reportSummary}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 flex items-center">{Icon && <Icon className="w-3.5 h-3.5 mr-1" />}{label}</dt>
      <dd className="text-gray-900 break-words">{value}</dd>
    </div>
  );
}

function EditAssetForm({ asset, sites, isPending, onSave }: { asset: AssetDetail; sites: { id: string; label: string; city: string }[]; isPending: boolean; onSave: (payload: Record<string, unknown>) => void }) {
  const [category, setCategory] = useState<FieldServiceAssetCategory>(asset.category);
  const [label, setLabel] = useState(asset.label);
  const [siteId, setSiteId] = useState(asset.siteId ?? '');
  const [manufacturer, setManufacturer] = useState(asset.manufacturer ?? '');
  const [model, setModel] = useState(asset.model ?? '');
  const [serialNumber, setSerialNumber] = useState(asset.serialNumber ?? '');
  const [installedOn, setInstalledOn] = useState(asset.installedOn ?? '');
  const [warrantyEndsOn, setWarrantyEndsOn] = useState(asset.warrantyEndsOn ?? '');
  const [notes, setNotes] = useState(asset.notes ?? '');
  const [maintenanceInterval, setMaintenanceInterval] = useState(asset.maintenanceIntervalMonths ? String(asset.maintenanceIntervalMonths) : '');
  const [nextMaintenanceOn, setNextMaintenanceOn] = useState(asset.nextMaintenanceOn ?? '');

  return (
    <form
      className="border-t border-gray-100 pt-4 space-y-4"
      data-testid="asset-edit-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          category, label, siteId: siteId || null,
          manufacturer: manufacturer || null, model: model || null, serialNumber: serialNumber || null,
          installedOn: installedOn || null, warrantyEndsOn: warrantyEndsOn || null, notes: notes || null,
          maintenanceIntervalMonths: maintenanceInterval ? Number(maintenanceInterval) : null,
          nextMaintenanceOn: nextMaintenanceOn || null,
        });
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Libellé *</span>
          <input required maxLength={160} value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Catégorie</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as FieldServiceAssetCategory)} className={inputClass}>
            {FIELD_SERVICE_ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{FIELD_SERVICE_ASSET_CATEGORY_LABELS[c]}</option>)}
          </select></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Site</span>
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className={inputClass}>
            <option value="">Non précisé</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.city}</option>)}
          </select></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Marque</span>
          <input maxLength={120} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className={inputClass} /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Modèle</span>
          <input maxLength={120} value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Numéro de série</span>
          <input maxLength={120} value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={inputClass} /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Mise en service</span>
          <input type="date" value={installedOn} onChange={(e) => setInstalledOn(e.target.value)} className={inputClass} /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Fin de garantie</span>
          <input type="date" value={warrantyEndsOn} min={installedOn || undefined} onChange={(e) => setWarrantyEndsOn(e.target.value)} className={inputClass} /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Entretien périodique</span>
          <select value={maintenanceInterval} onChange={(e) => setMaintenanceInterval(e.target.value)} className={inputClass} data-testid="asset-edit-interval">
            <option value="">Aucun</option>
            {MAINTENANCE_INTERVAL_OPTIONS.map((m) => <option key={m} value={m}>{intervalLabel(m)}</option>)}
          </select></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Prochain entretien</span>
          <input type="date" value={nextMaintenanceOn} onChange={(e) => setNextMaintenanceOn(e.target.value)} className={inputClass} data-testid="asset-edit-next-maintenance" /></label>
      </div>
      <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Notes</span>
        <textarea rows={3} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} /></label>
      <div className="flex justify-end">
        <button type="submit" disabled={isPending || !label.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl" data-testid="asset-edit-submit">
          {isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </div>
    </form>
  );
}
