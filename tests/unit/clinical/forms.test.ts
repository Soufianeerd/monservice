import { describe, it, expect } from 'vitest';
import {
  validateFormTemplateSchema,
  validateFormAnswersAgainstSchema,
} from '@/lib/clinical/forms';
import { AppError } from '@/lib/errors';
import type { ClinicalFormTemplateSchema } from '@/lib/clinical/types';

describe('Clinical Forms & Questionnaires Domain Functions', () => {
  const validSchemaRaw: ClinicalFormTemplateSchema = {
    fields: [
      {
        id: 'douleur_score',
        label: 'Score douleur EVA',
        type: 'scale',
        min: 0,
        max: 10,
        step: 1,
        required: true,
      },
      {
        id: 'antecedents',
        label: 'Antécédents notables',
        type: 'textarea',
        required: false,
      },
      {
        id: 'sportif',
        label: 'Pratique sportive régulière',
        type: 'boolean',
        required: true,
      },
      {
        id: 'type_douleur',
        label: 'Type de douleur',
        type: 'single_choice',
        options: [
          { label: 'Aiguë', value: 'aigue' },
          { label: 'Chronique', value: 'chronique' },
        ],
        required: true,
      },
      {
        id: 'date_debut',
        label: 'Date de début des symptômes',
        type: 'date',
        required: false,
      },
      {
        id: 'amplitude',
        label: 'Amplitude articulaire',
        type: 'number',
        min: 0,
        max: 180,
        unit: '°',
        required: false,
      },
    ],
  };

  describe('validateFormTemplateSchema', () => {
    it('validates a correct template schema', () => {
      const validated = validateFormTemplateSchema(validSchemaRaw);
      expect(validated.fields).toHaveLength(6);
      expect(validated.fields[0].id).toBe('douleur_score');
    });

    it('rejects schema without fields array', () => {
      expect(() => validateFormTemplateSchema({})).toThrow(AppError);
      expect(() => validateFormTemplateSchema({ fields: [] })).toThrow(AppError);
    });

    it('rejects schema with duplicate field IDs', () => {
      const invalid = {
        fields: [
          { id: 'f1', label: 'Field 1', type: 'text', required: false },
          { id: 'f1', label: 'Field 2', type: 'number', required: false },
        ],
      };
      expect(() => validateFormTemplateSchema(invalid)).toThrow(AppError);
    });

    it('rejects single_choice field without options', () => {
      const invalid = {
        fields: [
          { id: 'f1', label: 'Select field', type: 'single_choice', options: [], required: false },
        ],
      };
      expect(() => validateFormTemplateSchema(invalid)).toThrow(AppError);
    });

    it('rejects field with invalid field ID format', () => {
      const invalid = {
        fields: [
          { id: 'field with spaces!', label: 'Field', type: 'text', required: false },
        ],
      };
      expect(() => validateFormTemplateSchema(invalid)).toThrow(AppError);
    });
  });

  describe('validateFormAnswersAgainstSchema', () => {
    const validatedSchema = validateFormTemplateSchema(validSchemaRaw);

    it('validates complete valid answers in strict mode', () => {
      const validAnswers = {
        douleur_score: 7,
        antecedents: 'Chute en 2023',
        sportif: true,
        type_douleur: 'chronique',
        date_debut: '2026-01-10',
        amplitude: 110,
      };

      const result = validateFormAnswersAgainstSchema(validatedSchema, validAnswers, true);
      expect(result.douleur_score).toBe(7);
      expect(result.sportif).toBe(true);
      expect(result.type_douleur).toBe('chronique');
    });

    it('allows partial answers when strictMode is false (draft mode)', () => {
      const partialAnswers = {
        douleur_score: 5,
      };

      const result = validateFormAnswersAgainstSchema(validatedSchema, partialAnswers, false);
      expect(result.douleur_score).toBe(5);
    });

    it('fails in strict mode when a required field is missing', () => {
      const missingRequired = {
        douleur_score: 5,
        // missing 'sportif' and 'type_douleur'
      };

      expect(() =>
        validateFormAnswersAgainstSchema(validatedSchema, missingRequired, true),
      ).toThrow(AppError);
    });

    it('rejects invalid answer data types', () => {
      expect(() =>
        validateFormAnswersAgainstSchema(
          validatedSchema,
          { douleur_score: 'not-a-number', sportif: true, type_douleur: 'aigue' },
          false,
        ),
      ).toThrow(AppError);

      expect(() =>
        validateFormAnswersAgainstSchema(
          validatedSchema,
          { sportif: 'not-a-boolean' },
          false,
        ),
      ).toThrow(AppError);

      expect(() =>
        validateFormAnswersAgainstSchema(
          validatedSchema,
          { type_douleur: 'invalid_option' },
          false,
        ),
      ).toThrow(AppError);
    });

    it('rejects answers with unknown keys not defined in schema', () => {
      const withExtra = {
        douleur_score: 3,
        unknown_key: 'hacked',
      };

      expect(() => validateFormAnswersAgainstSchema(validatedSchema, withExtra, false)).toThrow(
        AppError,
      );
    });
  });
});
