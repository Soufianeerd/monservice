/**
 * Session 19 — référentiel des équipements clients (sans dépendance serveur,
 * utilisable par le schéma Drizzle, la validation et l'interface).
 * Toute modification doit suivre la contrainte SQL field_service_assets_*_check.
 */
export const FIELD_SERVICE_ASSET_CATEGORIES = [
  'heating', 'cooling', 'ventilation', 'plumbing', 'electrical', 'appliance',
  'security', 'it_equipment', 'vehicle', 'structure', 'other',
] as const;
export type FieldServiceAssetCategory = (typeof FIELD_SERVICE_ASSET_CATEGORIES)[number];

export const FIELD_SERVICE_ASSET_STATUSES = ['active', 'out_of_service', 'decommissioned'] as const;
export type FieldServiceAssetStatus = (typeof FIELD_SERVICE_ASSET_STATUSES)[number];

export const FIELD_SERVICE_ASSET_CATEGORY_LABELS: Record<FieldServiceAssetCategory, string> = {
  heating: 'Chauffage (chaudière, PAC…)',
  cooling: 'Climatisation',
  ventilation: 'Ventilation / VMC',
  plumbing: 'Plomberie / eau chaude',
  electrical: 'Électricité (tableau, borne…)',
  appliance: 'Appareil / électroménager',
  security: 'Sécurité / alarme / incendie',
  it_equipment: 'Informatique / réseau',
  vehicle: 'Véhicule',
  structure: 'Bâti (toiture, menuiserie…)',
  other: 'Autre',
};

export const FIELD_SERVICE_ASSET_STATUS_LABELS: Record<FieldServiceAssetStatus, string> = {
  active: 'En service',
  out_of_service: 'Hors service',
  decommissioned: 'Retiré / mis au rebut',
};

/** Nombre de jours avant l'échéance de garantie à partir duquel on alerte. */
export const WARRANTY_ALERT_DAYS = 60;

export type WarrantyState = 'none' | 'valid' | 'expiring' | 'expired';

/** État de garantie à une date de référence (dates ISO AAAA-MM-JJ). */
export function getWarrantyState(warrantyEndsOn: string | null | undefined, today: string): WarrantyState {
  if (!warrantyEndsOn) return 'none';
  if (warrantyEndsOn < today) return 'expired';
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + WARRANTY_ALERT_DAYS);
  return warrantyEndsOn <= limit.toISOString().slice(0, 10) ? 'expiring' : 'valid';
}

/** Périodicités d'entretien proposées (mois). */
export const MAINTENANCE_INTERVAL_OPTIONS = [3, 6, 12, 24, 36, 60] as const;

/** Nombre de jours avant l'échéance d'entretien à partir duquel on alerte. */
export const MAINTENANCE_ALERT_DAYS = 30;

export type MaintenanceState = 'none' | 'scheduled' | 'due_soon' | 'overdue';

export function addMonthsIso(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** État d'entretien à une date de référence (dates ISO AAAA-MM-JJ). */
export function getMaintenanceState(nextMaintenanceOn: string | null | undefined, today: string): MaintenanceState {
  if (!nextMaintenanceOn) return 'none';
  if (nextMaintenanceOn < today) return 'overdue';
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + MAINTENANCE_ALERT_DAYS);
  return nextMaintenanceOn <= limit.toISOString().slice(0, 10) ? 'due_soon' : 'scheduled';
}
