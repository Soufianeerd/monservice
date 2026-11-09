import React from 'react';
import {
  FIELD_SERVICE_ASSET_STATUS_LABELS,
  type FieldServiceAssetStatus,
  type WarrantyState,
} from '@/lib/workspaces/field-service/assets';

export function formatDateFr(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

const statusStyles: Record<FieldServiceAssetStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  out_of_service: 'bg-rose-50 text-rose-700 border-rose-200',
  decommissioned: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function AssetStatusBadge({ status }: { status: FieldServiceAssetStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium ${statusStyles[status]}`} data-testid="asset-status-badge">
      {FIELD_SERVICE_ASSET_STATUS_LABELS[status]}
    </span>
  );
}

const warrantyText: Record<Exclude<WarrantyState, 'none'>, { label: string; style: string }> = {
  valid: { label: 'Sous garantie', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  expiring: { label: 'Garantie bientôt échue', style: 'bg-amber-50 text-amber-800 border-amber-200' },
  expired: { label: 'Hors garantie', style: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export function WarrantyBadge({ state, endsOn }: { state: WarrantyState; endsOn: string | null }) {
  if (state === 'none') return null;
  const { label, style } = warrantyText[state];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium ${style}`} title={`Fin de garantie : ${formatDateFr(endsOn)}`}>
      {label}
    </span>
  );
}
