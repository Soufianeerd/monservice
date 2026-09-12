import { describe, it, expect } from 'vitest';
import {
  validateMeasurementInput,
  MEASUREMENT_CODE_REGEX,
} from '@/lib/clinical/measurements';
import { AppError } from '@/lib/errors';

describe('Clinical Measurements Domain Functions', () => {
  describe('MEASUREMENT_CODE_REGEX', () => {
    it('accepts valid alphanumeric, underscore and dot codes', () => {
      expect(MEASUREMENT_CODE_REGEX.test('pain_score')).toBe(true);
      expect(MEASUREMENT_CODE_REGEX.test('weight')).toBe(true);
      expect(MEASUREMENT_CODE_REGEX.test('knee.flexion_angle')).toBe(true);
      expect(MEASUREMENT_CODE_REGEX.test('blood_pressure.systolic')).toBe(true);
      expect(MEASUREMENT_CODE_REGEX.test('scale-10')).toBe(true);
    });

    it('rejects invalid codes with uppercase or special characters', () => {
      expect(MEASUREMENT_CODE_REGEX.test('PainScore')).toBe(false);
      expect(MEASUREMENT_CODE_REGEX.test('code with spaces')).toBe(false);
      expect(MEASUREMENT_CODE_REGEX.test('code/slash')).toBe(false);
      expect(MEASUREMENT_CODE_REGEX.test('')).toBe(false);
    });
  });

  describe('validateMeasurementInput', () => {
    it('accepts valid numeric measurement', () => {
      const input = {
        code: 'pain_score',
        label: 'Échelle de douleur EVA',
        valueNumeric: 6,
        valueText: null,
        unit: '/10',
        observedAt: new Date(Date.now() - 10000).toISOString(),
      };

      const validated = validateMeasurementInput(input);
      expect(validated.code).toBe('pain_score');
      expect(validated.valueNumeric).toBe(6);
      expect(validated.valueText).toBeNull();
      expect(validated.unit).toBe('/10');
    });

    it('accepts valid text observation', () => {
      const input = {
        code: 'posture_observation',
        label: 'Observation posturale',
        valueNumeric: null,
        valueText: 'Bascule du bassin à droite',
        unit: null,
        observedAt: new Date(Date.now() - 10000).toISOString(),
      };

      const validated = validateMeasurementInput(input);
      expect(validated.code).toBe('posture_observation');
      expect(validated.valueNumeric).toBeNull();
      expect(validated.valueText).toBe('Bascule du bassin à droite');
    });

    it('rejects input with both numeric and text values (XOR violation)', () => {
      const input = {
        code: 'weight',
        label: 'Poids',
        valueNumeric: 75,
        valueText: 'soixante-quinze',
        observedAt: new Date(Date.now() - 10000).toISOString(),
      };

      expect(() => validateMeasurementInput(input)).toThrow(AppError);
    });

    it('rejects input with neither numeric nor text values (XOR violation)', () => {
      const input = {
        code: 'weight',
        label: 'Poids',
        valueNumeric: null,
        valueText: null,
        observedAt: new Date(Date.now() - 10000).toISOString(),
      };

      expect(() => validateMeasurementInput(input)).toThrow(AppError);
    });

    it('rejects future observation date', () => {
      const input = {
        code: 'pain_score',
        label: 'Douleur',
        valueNumeric: 4,
        observedAt: new Date(Date.now() + 3600000).toISOString(),
      };

      expect(() => validateMeasurementInput(input)).toThrow(AppError);
    });

    it('rejects invalid code format or empty label', () => {
      expect(() =>
        validateMeasurementInput({
          code: 'INVALID CODE',
          label: 'Label',
          valueNumeric: 5,
          observedAt: new Date().toISOString(),
        }),
      ).toThrow(AppError);

      expect(() =>
        validateMeasurementInput({
          code: 'valid_code',
          label: '',
          valueNumeric: 5,
          observedAt: new Date().toISOString(),
        }),
      ).toThrow(AppError);
    });
  });
});
