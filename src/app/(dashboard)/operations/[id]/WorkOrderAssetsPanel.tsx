'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Wrench, X } from 'lucide-react';
import {
  linkAssetToWorkOrderAction,
  unlinkAssetFromWorkOrderAction,
} from '@/app/actions/field-service-assets.actions';
import {
  FIELD_SERVICE_ASSET_CATEGORY_LABELS,
  type FieldServiceAssetCategory,
} from '@/lib/workspaces/field-service/assets';

interface AssetOption {
  id: string;
  label: string;
  category: FieldServiceAssetCategory;
  serialNumber: string | null;
}

interface Props {
  workOrderId: string;
  isClosed: boolean;
  linkedAssets: AssetOption[];
  availableAssets: AssetOption[];
}

/** Session 19 — équipements du client concernés par cette opération. */
export default function WorkOrderAssetsPanel({ workOrderId, isClosed, linkedAssets, availableAssets }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState('');

  const mutate = (action: (input: { workOrderId: string; assetId: string }) => Promise<{ ok: true } | { ok: false; error: string }>, assetId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await action({ workOrderId, assetId });
      if (!result.ok) { setError(result.error); return; }
      setSelected('');
      router.refresh();
    });
  };

  return (
    <section className="px-4 sm:px-8 max-w-7xl mx-auto pb-8" data-testid="work-order-assets">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center"><Wrench className="w-5 h-5 mr-2 text-gray-400" />Équipements concernés</h2>
          <Link href="/operations/equipements" className="text-sm font-medium text-primary-700 hover:underline">Parc du client</Link>
        </div>

        {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}

        {linkedAssets.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun équipement rattaché à cette opération.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl" data-testid="linked-assets">
            {linkedAssets.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 p-3">
                <Link href={`/operations/equipements/${a.id}`} className="min-w-0">
                  <span className="block font-medium text-gray-900 truncate">{a.label}</span>
                  <span className="block text-xs text-gray-500 truncate">
                    {FIELD_SERVICE_ASSET_CATEGORY_LABELS[a.category]}{a.serialNumber ? ` · N° ${a.serialNumber}` : ''}
                  </span>
                </Link>
                {!isClosed && (
                  <button type="button" disabled={isPending} onClick={() => mutate(unlinkAssetFromWorkOrderAction, a.id)} aria-label={`Retirer ${a.label} de l’opération`} className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {isClosed ? (
          <p className="text-xs text-gray-500">Opération terminée ou annulée : la liste des équipements est figée dans l’historique.</p>
        ) : availableAssets.length > 0 ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <select aria-label="Équipement à rattacher" value={selected} onChange={(e) => setSelected(e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" data-testid="asset-link-select">
              <option value="">Choisir un équipement du client…</option>
              {availableAssets.map((a) => (
                <option key={a.id} value={a.id}>{a.label}{a.serialNumber ? ` (N° ${a.serialNumber})` : ''}</option>
              ))}
            </select>
            <button type="button" disabled={!selected || isPending} onClick={() => mutate(linkAssetToWorkOrderAction, selected)} className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl" data-testid="asset-link-submit">
              <Plus className="w-4 h-4 mr-1.5" />Rattacher
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Aucun autre équipement en service pour ce client. <Link href="/operations/equipements" className="text-primary-700 hover:underline">Enregistrer un équipement</Link>
          </p>
        )}
      </div>
    </section>
  );
}
