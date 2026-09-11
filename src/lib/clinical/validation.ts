import { z } from 'zod';

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
