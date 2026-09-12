import { AppError } from '@/lib/errors';
import { CreateClinicalMeasurementInput } from './types';

export const MEASUREMENT_CODE_REGEX = /^[a-z0-9][a-z0-9_.-]{0,99}$/;

export function validateMeasurementInput(input: CreateClinicalMeasurementInput): {
  code: string;
  label: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  observedAt: string;
  careEpisodeId: string | null;
  encounterId: string | null;
} {
  const code = input.code?.trim();
  if (!code || !MEASUREMENT_CODE_REGEX.test(code)) {
    throw new AppError(
      'Le code de mesure est invalide (doit commencer par une lettre minuscule ou un chiffre, 1-100 caractères)',
      400,
      'INVALID_MEASUREMENT_CODE',
    );
  }

  const label = input.label?.trim();
  if (!label || label.length > 160) {
    throw new AppError('Le libellé de la mesure doit comporter entre 1 et 160 caractères', 400, 'INVALID_MEASUREMENT_LABEL');
  }

  const hasNumeric = input.valueNumeric !== undefined && input.valueNumeric !== null && !isNaN(Number(input.valueNumeric));
  const hasText = input.valueText !== undefined && input.valueText !== null && input.valueText.trim().length > 0;

  // Strict XOR Check
  if ((hasNumeric && hasText) || (!hasNumeric && !hasText)) {
    throw new AppError(
      'La mesure doit comporter exactement une valeur numérique OU une valeur textuelle, pas les deux ni aucune.',
      400,
      'MEASUREMENT_VALUE_XOR_VIOLATION',
    );
  }

  let valueNumeric: number | null = null;
  let valueText: string | null = null;

  if (hasNumeric) {
    valueNumeric = Number(input.valueNumeric);
  } else if (hasText) {
    const trimmed = input.valueText!.trim();
    if (trimmed.length > 500) {
      throw new AppError('La valeur textuelle de la mesure ne peut pas dépasser 500 caractères', 400, 'MEASUREMENT_TEXT_TOO_LONG');
    }
    valueText = trimmed;
  }

  const unit = input.unit ? input.unit.trim().slice(0, 40) : null;

  if (!input.observedAt || isNaN(Date.parse(input.observedAt))) {
    throw new AppError('La date de relevé de la mesure est invalide', 400, 'INVALID_OBSERVED_AT');
  }

  const observedDate = new Date(input.observedAt);
  const now = new Date();
  // Tolérance de 5 secondes pour décalages d'horloges
  if (observedDate.getTime() > now.getTime() + 5000) {
    throw new AppError('Une mesure clinique ne peut pas être enregistrée dans le futur', 400, 'FUTURE_MEASUREMENT_FORBIDDEN');
  }

  return {
    code,
    label,
    valueNumeric,
    valueText,
    unit,
    observedAt: observedDate.toISOString(),
    careEpisodeId: input.careEpisodeId || null,
    encounterId: input.encounterId || null,
  };
}
