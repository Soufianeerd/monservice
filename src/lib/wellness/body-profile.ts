/**
 * Profil corporel d'un client bien-être : âge et indice de masse corporelle,
 * calculés à partir des valeurs saisies par le professionnel.
 */
export interface BmiResult {
  value: number;
  label: string;
}

/** IMC = poids (kg) / taille (m)². Catégories de l'OMS pour l'adulte. */
export function computeBmi(weightKg: number | null | undefined, heightCm: number | null | undefined): BmiResult | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const meters = heightCm / 100;
  const value = Math.round((weightKg / (meters * meters)) * 10) / 10;
  if (!Number.isFinite(value)) return null;
  const label = value < 18.5 ? 'Insuffisance pondérale'
    : value < 25 ? 'Corpulence normale'
    : value < 30 ? 'Surpoids'
    : 'Obésité';
  return { value, label };
}

/** Âge en années révolues à une date donnée (ISO aaaa-mm-jj). */
export function ageFromBirthDate(birthDate: string | null | undefined, today: Date = new Date()): number | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  if (!year || !month || !day) return null;
  let age = today.getFullYear() - year;
  const beforeBirthday = today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** Dernière valeur numérique d'une mesure (par code) parmi des relevés. */
export function latestMeasurement(measurements: { code: string; valueNumeric: number | null; observedAt: string }[], code: string): number | null {
  const sorted = measurements
    .filter((m) => m.code === code && m.valueNumeric !== null)
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  return sorted[0]?.valueNumeric ?? null;
}
