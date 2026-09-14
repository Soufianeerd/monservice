import { z } from 'zod';

export const grantPatientPortalAccessSchema = z.object({
  patientId: z.string().min(1, 'Identifiant patient requis'),
  email: z.string().email('Email invalide').trim().toLowerCase(),
  representativeId: z.string().min(1).optional().nullable(),
});

export const revokePatientPortalAccessSchema = z.object({
  accessId: z.string().min(1, 'Identifiant d’accès requis'),
});

export const assignQuestionnaireSchema = z.object({
  patientId: z.string().min(1, 'Identifiant patient requis'),
  templateId: z.string().min(1, 'Identifiant modèle requis'),
  careEpisodeId: z.string().min(1).optional().nullable(),
  dueAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export const saveQuestionnaireDraftSchema = z.object({
  assignmentId: z.string().min(1, 'Identifiant assignation requis'),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])),
});

export const submitQuestionnaireSchema = z.object({
  assignmentId: z.string().min(1, 'Identifiant assignation requis'),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])),
});

export const shareDocumentSchema = z.object({
  patientId: z.string().min(1, 'Identifiant patient requis'),
  documentId: z.string().min(1, 'Identifiant document requis'),
  visible: z.boolean(),
});
