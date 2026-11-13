import { describe, expect, it } from 'vitest';
import {
  attendanceRates,
  fillMonthlyActivity,
  formatHours,
  lastMonthKeys,
  monthLabel,
  parsePracticeStatisticsPeriod,
  periodStart,
  ratePercent,
} from '@/lib/workspaces/paramedical/statistics';

describe('statistiques du cabinet — calculs', () => {
  const now = new Date('2026-11-12T10:00:00Z');

  it('retombe sur 90 jours pour une période inconnue', () => {
    expect(parsePracticeStatisticsPeriod('30d')).toBe('30d');
    expect(parsePracticeStatisticsPeriod('12m')).toBe('12m');
    expect(parsePracticeStatisticsPeriod('1 an; drop table')).toBe('90d');
    expect(parsePracticeStatisticsPeriod(['30d'])).toBe('90d');
  });

  it('calcule le début de chaque période', () => {
    expect(periodStart('30d', now).toISOString()).toBe('2026-10-13T10:00:00.000Z');
    expect(periodStart('90d', now).toISOString()).toBe('2026-08-14T10:00:00.000Z');
    expect(periodStart('12m', now).toISOString()).toBe('2025-11-12T10:00:00.000Z');
  });

  it('ne divise jamais par zéro', () => {
    expect(ratePercent(0, 0)).toBeNull();
    expect(ratePercent(1, 3)).toBe(33.3);
    expect(attendanceRates({ honored: 0, noShow: 0, cancelled: 0 })).toEqual({ noShowRate: null, cancellationRate: null });
  });

  it('exclut les annulations du taux d’absence', () => {
    // 18 honorés, 2 absences, 5 annulés : absence 2/20, annulation 5/25.
    expect(attendanceRates({ honored: 18, noShow: 2, cancelled: 5 })).toEqual({ noShowRate: 10, cancellationRate: 20 });
  });

  it('complète les mois sans activité, du plus ancien au mois courant', () => {
    expect(lastMonthKeys(3, now)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(lastMonthKeys(12, new Date('2026-01-31T23:00:00Z'))[0]).toBe('2025-02');
    const filled = fillMonthlyActivity([{ month: '2026-10', honored: 4, noShow: 1, cancelled: 0 }], 3, now);
    expect(filled).toEqual([
      { month: '2026-09', honored: 0, noShow: 0, cancelled: 0 },
      { month: '2026-10', honored: 4, noShow: 1, cancelled: 0 },
      { month: '2026-11', honored: 0, noShow: 0, cancelled: 0 },
    ]);
  });

  it('formate les mois et les durées', () => {
    expect(monthLabel('2026-02')).toBe('févr. 26');
    expect(formatHours(0)).toBe('0 h');
    expect(formatHours(120)).toBe('2 h');
    expect(formatHours(95)).toBe('1 h 35');
  });
});
