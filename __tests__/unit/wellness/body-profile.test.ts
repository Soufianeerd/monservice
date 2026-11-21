import { describe, expect, it } from 'vitest';
import { ageFromBirthDate, computeBmi, latestMeasurement } from '@/lib/wellness/body-profile';

describe('profil corporel bien-être', () => {
  it('calcule l’IMC et sa catégorie', () => {
    expect(computeBmi(70, 175)).toEqual({ value: 22.9, label: 'Corpulence normale' });
    expect(computeBmi(95, 175)?.label).toBe('Obésité');
    expect(computeBmi(50, 180)?.label).toBe('Insuffisance pondérale');
    expect(computeBmi(null, 175)).toBeNull();
    expect(computeBmi(70, 0)).toBeNull();
  });

  it('calcule l’âge en années révolues', () => {
    const today = new Date(2026, 10, 21);
    expect(ageFromBirthDate('1990-11-21', today)).toBe(36);
    expect(ageFromBirthDate('1990-11-22', today)).toBe(35);
    expect(ageFromBirthDate('', today)).toBeNull();
  });

  it('prend la mesure la plus récente', () => {
    const rows = [
      { code: 'weight', valueNumeric: 80, observedAt: '2026-01-01T10:00:00Z' },
      { code: 'weight', valueNumeric: 76, observedAt: '2026-06-01T10:00:00Z' },
      { code: 'height', valueNumeric: 178, observedAt: '2026-01-01T10:00:00Z' },
    ];
    expect(latestMeasurement(rows, 'weight')).toBe(76);
    expect(latestMeasurement(rows, 'waist')).toBeNull();
  });
});
