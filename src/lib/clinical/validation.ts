import { z } from 'zod';
import {
  CLINICAL_DOCUMENT_CATEGORIES,
  CLINICAL_DOCUMENT_ALLOWED_MIME_TYPES,
  CLINICAL_FORM_KINDS,
  CLINICAL_FORM_FIELD_TYPES,
} from './types';
import { MEASUREMENT_CODE_REGEX } from './measurements';

export const createCareEpisodeSchema = z.object({
  title: z
    .string()
    .trim()
    .max(160, 'Le titre ne doit pas dépasser 160 caractères')
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val.trim().length === 0) return null;
      return val.trim();
    }),
});

export const createClinicalEncounterSchema = z.object({
  careEpisodeId: z.string().min(1, 'Identifiant épisode requis'),
  occurredAt: z
    .string()
    .min(1, 'Date et heure de la séance requises')
    .refine((val) => !isNaN(Date.parse(val)), 'Format de date invalide')
    .refine((val) => new Date(val).getTime() <= Date.now() + 60000, 'Une séance ne peut pas avoir eu lieu dans le futur'),
  appointmentId: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val.trim().length === 0) return null;
      return val.trim();
    }),
});

export const createClinicalNoteSchema = z.object({
  encounterId: z.string().min(1, 'Identifiant de la séance requis'),
  content: z
    .string()
    .trim()
    .min(1, 'Le contenu de la note ne peut pas être vide')
    .max(50000, 'Le contenu de la note ne doit pas dépasser 50 000 caractères'),
});

export const updateDraftClinicalNoteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Le contenu de la note ne peut pas être vide')
    .max(50000, 'Le contenu de la note ne doit pas dépasser 50 000 caractères'),
});

export const closeCareEpisodeSchema = z.object({
  episodeId: z.string().min(1, 'Identifiant épisode requis'),
});

export const finalizeClinicalNoteSchema = z.object({
  noteId: z.string().min(1, 'Identifiant de la note requis'),
});

// ==========================================
// SESSION 12 : DOCUMENTS VALIDATION
// ==========================================

export const uploadClinicalDocumentMetadataSchema = z.object({
  careEpisodeId: z.string().optional().nullable().transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  encounterId: z.string().optional().nullable().transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  title: z.string().trim().min(1, 'Le titre est requis').max(200, 'Le titre ne peut pas dépasser 200 caractères'),
  category: z.enum(CLINICAL_DOCUMENT_CATEGORIES, {
    message: 'Catégorie de document invalide',
  }),
  fileName: z.string().trim().min(1, 'Nom de fichier requis').max(255, 'Nom de fichier trop long'),
  mimeType: z.enum(CLINICAL_DOCUMENT_ALLOWED_MIME_TYPES, {
    message: 'Format de document non supporté (PDF, JPEG, PNG, WEBP acceptés)',
  }),
  sizeBytes: z
    .number()
    .int()
    .positive('La taille du fichier doit être strictement positive')
    .max(10 * 1024 * 1024, 'Le document dépasse la limite autorisée de 10 Mo'),
});

export const updateClinicalDocumentSchema = z.object({
  documentId: z.string().min(1, 'Identifiant du document requis'),
  title: z.string().trim().min(1, 'Le titre ne peut pas être vide').max(200, 'Le titre ne peut pas dépasser 200 caractères').optional(),
  category: z.enum(CLINICAL_DOCUMENT_CATEGORIES).optional(),
  patientVisible: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const setClinicalDocumentPatientVisibleSchema = z.object({
  documentId: z.string().min(1, 'Identifiant du document requis'),
  patientVisible: z.boolean(),
});

export const archiveClinicalDocumentSchema = z.object({
  documentId: z.string().min(1, 'Identifiant du document requis'),
});

export const getClinicalDocumentDownloadUrlSchema = z.object({
  documentId: z.string().min(1, 'Identifiant du document requis'),
});

// ==========================================
// SESSION 12 : FORM TEMPLATES VALIDATION
// ==========================================

export const clinicalFormFieldOptionSchema = z.object({
  value: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

export const clinicalFormFieldSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(CLINICAL_FORM_FIELD_TYPES),
  label: z.string().trim().min(1),
  description: z.string().trim().optional(),
  required: z.boolean(),
  options: z.array(clinicalFormFieldOptionSchema).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  placeholder: z.string().trim().optional(),
  unit: z.string().trim().optional(),
});

export const clinicalFormTemplateSchemaZod = z.object({
  fields: z.array(clinicalFormFieldSchema),
});

export const clinicalFormAnswerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
  z.undefined(),
]);

export const clinicalFormAnswersSchema = z.record(z.string(), clinicalFormAnswerValueSchema);

export const createClinicalFormTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Le nom du formulaire est requis').max(200, 'Le nom ne peut pas dépasser 200 caractères'),
  kind: z.enum(CLINICAL_FORM_KINDS, {
    message: 'Type de formulaire invalide',
  }),
  description: z.string().trim().max(1000, 'La description ne peut pas dépasser 1000 caractères').optional().nullable(),
  schemaJson: clinicalFormTemplateSchemaZod,
});

export const updateClinicalFormTemplateSchema = z.object({
  templateId: z.string().min(1, 'Identifiant du template requis'),
  name: z.string().trim().min(1, 'Le nom ne peut pas être vide').max(200, 'Le nom ne peut pas dépasser 200 caractères').optional(),
  kind: z.enum(CLINICAL_FORM_KINDS).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  schemaJson: clinicalFormTemplateSchemaZod.optional(),
  isActive: z.boolean().optional(),
});

// ==========================================
// SESSION 12 : FORM RESPONSES VALIDATION
// ==========================================

export const createClinicalFormResponseSchema = z.object({
  templateId: z.string().min(1, 'Identifiant du template requis'),
  careEpisodeId: z.string().optional().nullable().transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  encounterId: z.string().optional().nullable().transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  answersJson: clinicalFormAnswersSchema,
});

export const updateDraftClinicalFormResponseSchema = z.object({
  responseId: z.string().min(1, 'Identifiant de la réponse requis'),
  careEpisodeId: z.string().optional().nullable().transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  encounterId: z.string().optional().nullable().transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  answersJson: clinicalFormAnswersSchema,
});

export const finalizeClinicalFormResponseSchema = z.object({
  responseId: z.string().min(1, 'Identifiant de la réponse requis'),
  answersJson: clinicalFormAnswersSchema.optional(),
});

// ==========================================
// SESSION 12 : MEASUREMENTS VALIDATION
// ==========================================

export const createClinicalMeasurementSchema = z.object({
  careEpisodeId: z.string().optional().nullable().transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  encounterId: z.string().optional().nullable().transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  code: z
    .string()
    .trim()
    .regex(MEASUREMENT_CODE_REGEX, 'Code de mesure technique invalide (ex: pain_score, weight, knee.flexion)'),
  label: z.string().trim().min(1, 'Le libellé de la mesure est requis').max(160, 'Le libellé ne peut pas dépasser 160 caractères'),
  valueNumeric: z.number().nullable().optional(),
  valueText: z.string().trim().max(500, 'La valeur textuelle ne peut pas dépasser 500 caractères').nullable().optional(),
  unit: z.string().trim().max(40, 'L’unité ne peut pas dépasser 40 caractères').nullable().optional(),
  observedAt: z
    .string()
    .min(1, 'Date de relevé requise')
    .refine((val) => !isNaN(Date.parse(val)), 'Format de date invalide')
    .refine((val) => new Date(val).getTime() <= Date.now() + 5000, 'Une mesure ne peut pas être enregistrée dans le futur'),
});
