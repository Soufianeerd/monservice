import {
  CLINICAL_FORM_KINDS,
  CLINICAL_FORM_FIELD_TYPES,
  ClinicalFormKind,
  ClinicalFormFieldType,
  ClinicalFormTemplateSchema,
  ClinicalFormFieldDefinition,
  ClinicalFormAnswers,
} from './types';
import { AppError } from '@/lib/errors';

export const MAX_FIELDS_PER_TEMPLATE = 100;
export const MAX_OPTIONS_PER_CHOICE = 50;

export function isValidFormKind(kind: string): kind is ClinicalFormKind {
  return (CLINICAL_FORM_KINDS as readonly string[]).includes(kind);
}

export function isValidFormFieldType(type: string): type is ClinicalFormFieldType {
  return (CLINICAL_FORM_FIELD_TYPES as readonly string[]).includes(type);
}

/**
 * Valide strictement la structure d'un template de formulaire clinique :
 * - Maximum 100 champs.
 * - Identifiants de champs uniques, non vides, alphanumériques sûrs.
 * - Types de champs supportés (text, textarea, number, boolean, single_choice, multiple_choice, date, scale).
 * - Libellés valides (1-200 caractères).
 * - Options obligatoires pour single_choice / multiple_choice (1-50 options).
 * - Bornes cohérentes pour scale / number.
 */
export function validateFormTemplateSchema(schema: unknown): ClinicalFormTemplateSchema {
  if (!schema || typeof schema !== 'object' || !('fields' in schema) || !Array.isArray(schema.fields)) {
    throw new AppError('Le schéma du formulaire doit contenir une liste de champs "fields"', 400, 'INVALID_FORM_SCHEMA');
  }

  const fields = schema.fields as unknown[];
  if (fields.length === 0) {
    throw new AppError('Le formulaire doit contenir au moins un champ', 400, 'INVALID_FORM_SCHEMA');
  }

  if (fields.length > MAX_FIELDS_PER_TEMPLATE) {
    throw new AppError(
      `Le formulaire ne peut pas contenir plus de ${MAX_FIELDS_PER_TEMPLATE} champs`,
      400,
      'INVALID_FORM_SCHEMA',
    );
  }

  const fieldIds = new Set<string>();
  const validatedFields: ClinicalFormFieldDefinition[] = [];

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (!field || typeof field !== 'object') {
      throw new AppError(`Le champ #${i + 1} est invalide`, 400, 'INVALID_FORM_FIELD');
    }

    const raw = field as Record<string, unknown>;
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    const type = typeof raw.type === 'string' ? raw.type.trim() : '';
    const label = typeof raw.label === 'string' ? raw.label.trim() : '';
    const description = typeof raw.description === 'string' ? raw.description.trim() : undefined;
    const required = Boolean(raw.required);

    if (!id || !/^[a-zA-Z0-9_.-]{1,64}$/.test(id)) {
      throw new AppError(
        `L'identifiant du champ #${i + 1} ("${id}") est invalide (1-64 caractères alphanumériques/tirets/underscores)`,
        400,
        'INVALID_FORM_FIELD_ID',
      );
    }

    if (fieldIds.has(id)) {
      throw new AppError(`Identifiant de champ en double : "${id}"`, 400, 'DUPLICATE_FIELD_ID');
    }
    fieldIds.add(id);

    if (!isValidFormFieldType(type)) {
      throw new AppError(`Type de champ non supporté : "${type}" pour le champ "${id}"`, 400, 'INVALID_FIELD_TYPE');
    }

    if (!label || label.length > 200) {
      throw new AppError(`Le libellé du champ "${id}" doit comporter entre 1 et 200 caractères`, 400, 'INVALID_FIELD_LABEL');
    }

    const validatedField: ClinicalFormFieldDefinition = {
      id,
      type,
      label,
      description,
      required,
    };

    if (type === 'single_choice' || type === 'multiple_choice') {
      if (!Array.isArray(raw.options) || raw.options.length === 0) {
        throw new AppError(`Le champ à choix "${id}" doit contenir au moins une option`, 400, 'INVALID_FIELD_OPTIONS');
      }
      if (raw.options.length > MAX_OPTIONS_PER_CHOICE) {
        throw new AppError(
          `Le champ à choix "${id}" ne peut pas dépasser ${MAX_OPTIONS_PER_CHOICE} options`,
          400,
          'TOO_MANY_FIELD_OPTIONS',
        );
      }

      const optionValues = new Set<string>();
      validatedField.options = raw.options.map((opt, optIdx) => {
        if (!opt || typeof opt !== 'object') {
          throw new AppError(`Option #${optIdx + 1} invalide pour le champ "${id}"`, 400, 'INVALID_OPTION');
        }
        const optRaw = opt as Record<string, unknown>;
        const val = typeof optRaw.value === 'string' ? optRaw.value.trim() : '';
        const optLabel = typeof optRaw.label === 'string' ? optRaw.label.trim() : '';

        if (!val || val.length > 100) {
          throw new AppError(`Valeur d'option invalide pour le champ "${id}"`, 400, 'INVALID_OPTION_VALUE');
        }
        if (optionValues.has(val)) {
          throw new AppError(`Option en double ("${val}") pour le champ "${id}"`, 400, 'DUPLICATE_OPTION_VALUE');
        }
        optionValues.add(val);

        if (!optLabel || optLabel.length > 200) {
          throw new AppError(`Libellé d'option invalide pour le champ "${id}"`, 400, 'INVALID_OPTION_LABEL');
        }

        return { value: val, label: optLabel };
      });
    }

    if (type === 'scale') {
      const min = typeof raw.min === 'number' ? raw.min : 0;
      const max = typeof raw.max === 'number' ? raw.max : 10;
      const step = typeof raw.step === 'number' ? raw.step : 1;

      if (min >= max) {
        throw new AppError(`L'échelle du champ "${id}" doit avoir min < max`, 400, 'INVALID_SCALE_RANGE');
      }
      validatedField.min = min;
      validatedField.max = max;
      validatedField.step = step;
    }

    if (type === 'number') {
      if (typeof raw.min === 'number') validatedField.min = raw.min;
      if (typeof raw.max === 'number') validatedField.max = raw.max;
      if (typeof raw.step === 'number') validatedField.step = raw.step;
      if (validatedField.min !== undefined && validatedField.max !== undefined && validatedField.min > validatedField.max) {
        throw new AppError(`Les bornes min/max du champ numérique "${id}" sont incohérentes`, 400, 'INVALID_NUMBER_RANGE');
      }
    }

    if (typeof raw.placeholder === 'string') {
      validatedField.placeholder = raw.placeholder.slice(0, 100);
    }

    validatedFields.push(validatedField);
  }

  return { fields: validatedFields };
}

/**
 * Valide les réponses d'un formulaire par rapport au schéma de son template :
 * - Rejette les champs inconnus non présents dans le template.
 * - Vérifie la présence des champs obligatoires (required) si finalisation ou si renseignés.
 * - Valide les types (chaînes, nombres, booléens, dates, listes d'options valides).
 */
export function validateFormAnswersAgainstSchema(
  schema: ClinicalFormTemplateSchema,
  answers: unknown,
  isFinalizing = false,
): ClinicalFormAnswers {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new AppError('Les réponses doivent être un objet clé-valeur', 400, 'INVALID_FORM_ANSWERS');
  }

  const rawAnswers = answers as Record<string, unknown>;
  const fieldsById = new Map<string, ClinicalFormFieldDefinition>();
  for (const field of schema.fields) {
    fieldsById.set(field.id, field);
  }

  // 1. Rejeter toute clé de réponse qui n'existe pas dans le template
  for (const key of Object.keys(rawAnswers)) {
    if (!fieldsById.has(key)) {
      throw new AppError(`Champ de réponse inconnu : "${key}"`, 400, 'UNKNOWN_FORM_FIELD');
    }
  }

  const validatedAnswers: ClinicalFormAnswers = {};

  for (const field of schema.fields) {
    const val = rawAnswers[field.id];

    // Vérifier si le champ est absent ou vide
    const isEmpty =
      val === undefined ||
      val === null ||
      val === '' ||
      (Array.isArray(val) && val.length === 0);

    if (isEmpty) {
      if (isFinalizing && field.required) {
        throw new AppError(`Le champ obligatoire "${field.label}" doit être renseigné`, 400, 'REQUIRED_FIELD_MISSING');
      }
      validatedAnswers[field.id] = null;
      continue;
    }

    // Validation par type
    switch (field.type) {
      case 'text':
      case 'textarea': {
        if (typeof val !== 'string') {
          throw new AppError(`Valeur invalide pour le champ texte "${field.label}"`, 400, 'INVALID_ANSWER_TYPE');
        }
        const maxLen = field.type === 'textarea' ? 10000 : 1000;
        if (val.length > maxLen) {
          throw new AppError(
            `Le champ "${field.label}" dépasse la limite autorisée de ${maxLen} caractères`,
            400,
            'ANSWER_TOO_LONG',
          );
        }
        validatedAnswers[field.id] = val;
        break;
      }

      case 'number': {
        const num = typeof val === 'number' ? val : Number(val);
        if (isNaN(num)) {
          throw new AppError(`Le champ "${field.label}" doit être un nombre valide`, 400, 'INVALID_ANSWER_TYPE');
        }
        if (field.min !== undefined && num < field.min) {
          throw new AppError(`Le champ "${field.label}" doit être >= ${field.min}`, 400, 'NUMBER_OUT_OF_RANGE');
        }
        if (field.max !== undefined && num > field.max) {
          throw new AppError(`Le champ "${field.label}" doit être <= ${field.max}`, 400, 'NUMBER_OUT_OF_RANGE');
        }
        validatedAnswers[field.id] = num;
        break;
      }

      case 'boolean': {
        if (typeof val !== 'boolean') {
          throw new AppError(`Le champ "${field.label}" doit être un booléen`, 400, 'INVALID_ANSWER_TYPE');
        }
        validatedAnswers[field.id] = val;
        break;
      }

      case 'date': {
        if (typeof val !== 'string' || isNaN(Date.parse(val))) {
          throw new AppError(`Le champ "${field.label}" doit être une date valide`, 400, 'INVALID_DATE_FORMAT');
        }
        validatedAnswers[field.id] = new Date(val).toISOString();
        break;
      }

      case 'scale': {
        const num = typeof val === 'number' ? val : Number(val);
        if (isNaN(num)) {
          throw new AppError(`Le champ échelle "${field.label}" doit être un nombre`, 400, 'INVALID_ANSWER_TYPE');
        }
        const min = field.min ?? 0;
        const max = field.max ?? 10;
        if (num < min || num > max) {
          throw new AppError(
            `Le champ échelle "${field.label}" doit être compris entre ${min} et ${max}`,
            400,
            'SCALE_OUT_OF_RANGE',
          );
        }
        validatedAnswers[field.id] = num;
        break;
      }

      case 'single_choice': {
        if (typeof val !== 'string') {
          throw new AppError(`Le champ à choix unique "${field.label}" doit être une chaîne`, 400, 'INVALID_ANSWER_TYPE');
        }
        const allowed = new Set(field.options?.map((o) => o.value) || []);
        if (!allowed.has(val)) {
          throw new AppError(`Option non autorisée "${val}" pour le champ "${field.label}"`, 400, 'INVALID_CHOICE_OPTION');
        }
        validatedAnswers[field.id] = val;
        break;
      }

      case 'multiple_choice': {
        if (!Array.isArray(val) || !val.every((item) => typeof item === 'string')) {
          throw new AppError(`Le champ à choix multiples "${field.label}" doit être une liste de chaînes`, 400, 'INVALID_ANSWER_TYPE');
        }
        const allowed = new Set(field.options?.map((o) => o.value) || []);
        for (const item of val) {
          if (!allowed.has(item)) {
            throw new AppError(`Option non autorisée "${item}" pour le champ "${field.label}"`, 400, 'INVALID_CHOICE_OPTION');
          }
        }
        validatedAnswers[field.id] = val;
        break;
      }
    }
  }

  return validatedAnswers;
}
