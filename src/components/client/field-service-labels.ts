export const CLIENT_WORK_STATUS_LABELS: Record<string, { label: string; style: string }> = {
  scheduled: { label: 'Planifiée', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'En cours', style: 'bg-amber-50 text-amber-800 border-amber-200' },
  paused: { label: 'En pause', style: 'bg-purple-50 text-purple-700 border-purple-200' },
  completed: { label: 'Terminée', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Annulée', style: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export const CLIENT_WORK_TYPE_LABELS: Record<string, string> = {
  job: 'Chantier', intervention: 'Intervention', installation: 'Installation', maintenance: 'Entretien',
  repair: 'Dépannage', inspection: 'Contrôle', project: 'Projet', other: 'Autre',
};

export function formatDateTimeFr(value: Date | string | null | undefined, withTime = true): string {
  if (!value) return '—';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }
    : { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Paris' });
}
