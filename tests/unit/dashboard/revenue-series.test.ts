// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db/server', () => ({ db: {} }));

import { buildMonthlyRevenueSeries, monthlyRevenueWindow } from '@/lib/services/dashboard.service';
import { defaultCalendarWindow } from '@/lib/services/calendar.service';

describe('Graphique des affaires gagnées calculé en SQL', () => {
  it('couvre les six derniers mois UTC, du plus ancien au mois courant', () => {
    const { months, since } = monthlyRevenueWindow(6, new Date('2026-03-31T23:30:00.000Z'));
    expect(months.map((m) => m.key)).toEqual(['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']);
    expect(since).toBe('2025-10-01');
    // Une date ISO stockée en texte se compare à la borne comme une date.
    expect('2025-10-01T00:00:00.000Z' >= since).toBe(true);
    expect('2025-09-30T23:59:59.999Z' >= since).toBe(false);
  });

  it('place chaque mois agrégé sous son libellé et met 0 ailleurs', () => {
    const { months } = monthlyRevenueWindow(3, new Date('2026-11-21T10:00:00.000Z'));
    const series = buildMonthlyRevenueSeries(months, [{ month: '2026-10', revenue: 1500 }, { month: '2026-11', revenue: 250.5 }]);
    expect(series.map((p) => p.revenue)).toEqual([0, 1500, 250.5]);
    expect(series).toHaveLength(3);
    expect(series[2]?.month).toBe(new Date(Date.UTC(2026, 10, 1)).toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }));
  });
});

describe('Fenêtre du calendrier bornée', () => {
  it('charge de trois mois avant à douze mois après le mois courant', () => {
    expect(defaultCalendarWindow(new Date('2026-11-21T10:00:00.000Z'))).toEqual({
      start: '2026-08-01T00:00:00.000Z',
      end: '2027-12-01T00:00:00.000Z',
    });
  });
});
