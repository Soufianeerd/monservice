// Statistiques du cabinet — calculs purs (aucun accès base), testés unitairement.
// Un rendez-vous n'a que trois statuts en base (scheduled / cancelled / no_show) :
// « honoré » = resté `scheduled` et déjà terminé.

export const PRACTICE_STATISTICS_PERIODS = ['30d', '90d', '12m'] as const;
export type PracticeStatisticsPeriod = typeof PRACTICE_STATISTICS_PERIODS[number];

export const PRACTICE_STATISTICS_PERIOD_LABELS: Record<PracticeStatisticsPeriod, string> = {
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
  '12m': '12 derniers mois',
};

export function parsePracticeStatisticsPeriod(value: unknown): PracticeStatisticsPeriod {
  return PRACTICE_STATISTICS_PERIODS.find((period) => period === value) ?? '90d';
}

/** Début de période (inclus) ; la fin est toujours « maintenant ». */
export function periodStart(period: PracticeStatisticsPeriod, now: Date = new Date()): Date {
  const start = new Date(now);
  if (period === '12m') start.setUTCMonth(start.getUTCMonth() - 12);
  else start.setUTCDate(start.getUTCDate() - (period === '30d' ? 30 : 90));
  return start;
}

/** Pourcentage arrondi à une décimale ; `null` quand le dénominateur est nul. */
export function ratePercent(part: number, total: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

export type AttendanceCounts = { honored: number; noShow: number; cancelled: number };

/**
 * Taux d'absence : absences / (honorés + absences). Les annulations n'entrent
 * pas dans ce taux : un rendez-vous annulé à l'avance libère le créneau.
 */
export function attendanceRates(counts: AttendanceCounts) {
  const expected = counts.honored + counts.noShow;
  const booked = expected + counts.cancelled;
  return {
    noShowRate: ratePercent(counts.noShow, expected),
    cancellationRate: ratePercent(counts.cancelled, booked),
  };
}

export type MonthlyActivity = { month: string; honored: number; noShow: number; cancelled: number };

/** Clés `YYYY-MM` des `count` derniers mois, du plus ancien au mois courant. */
export function lastMonthKeys(count: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    keys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/** Complète les mois sans activité pour que la courbe n'ait pas de trou. */
export function fillMonthlyActivity(rows: readonly MonthlyActivity[], count: number, now: Date = new Date()): MonthlyActivity[] {
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return lastMonthKeys(count, now).map((month) => byMonth.get(month) ?? { month, honored: 0, noShow: 0, cancelled: 0 });
}

const MONTH_LABELS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const label = MONTH_LABELS[(month ?? 1) - 1] ?? key;
  return `${label} ${String(year).slice(2)}`;
}

export const WEEKDAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

export const CANCELLATION_REASON_LABELS: Record<string, string> = {
  patient_request: 'Demande du patient',
  practitioner_request: 'Demande du praticien',
  practice_unavailable: 'Cabinet indisponible',
  scheduling_error: 'Erreur de planification',
  duplicate: 'Doublon',
  other: 'Autre',
};

export function formatHours(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 h';
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`;
}
