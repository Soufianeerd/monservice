import { z } from 'zod';
import { AVAILABILITY_EXCEPTION_KINDS } from './types';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const appointmentTypeCreateSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire').max(120, 'Nom trop long (max 120 caractères)'),
  description: z.string().trim().max(500, 'Description trop longue (max 500 caractères)').nullable().optional(),
  durationMinutes: z.number().int().min(5, 'Durée minimale: 5 minutes').max(480, 'Durée maximale: 480 minutes (8h)'),
  bufferBeforeMinutes: z
    .number()
    .int()
    .min(0, 'Buffer avant minimal: 0 minute')
    .max(240, 'Buffer avant maximal: 240 minutes')
    .default(0),
  bufferAfterMinutes: z
    .number()
    .int()
    .min(0, 'Buffer après minimal: 0 minute')
    .max(240, 'Buffer après maximal: 240 minutes')
    .default(0),
  slotStepMinutes: z
    .number()
    .int()
    .min(5, 'Pas de créneau minimal: 5 minutes')
    .max(120, 'Pas de créneau maximal: 120 minutes')
    .default(15),
});

export const appointmentTypeUpdateSchema = appointmentTypeCreateSchema.extend({
  id: z.string().min(1, "L'identifiant du type de séance est obligatoire"),
});

export const availabilityRuleCreateSchema = z
  .object({
    practitionerId: z.string().min(1, 'Le praticien est obligatoire'),
    locationId: z.string().min(1, 'Le lieu est obligatoire'),
    weekday: z.number().int().min(0, 'Jour de semaine invalide (0-6)').max(6, 'Jour de semaine invalide (0-6)'),
    startTime: z.string().regex(TIME_REGEX, "Format d'heure de début invalide (HH:mm)"),
    endTime: z.string().regex(TIME_REGEX, "Format d'heure de fin invalide (HH:mm)"),
    validFrom: z.string().regex(DATE_REGEX, 'Format de date de début de validité invalide (YYYY-MM-DD)'),
    validUntil: z
      .string()
      .regex(DATE_REGEX, 'Format de date de fin de validité invalide (YYYY-MM-DD)')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      const start = data.startTime.slice(0, 5);
      const end = data.endTime.slice(0, 5);
      return start < end;
    },
    {
      message: "L'heure de début doit être strictement antérieure à l'heure de fin",
      path: ['endTime'],
    }
  )
  .refine(
    (data) => {
      if (!data.validUntil) return true;
      return data.validUntil >= data.validFrom;
    },
    {
      message: 'La date de fin de validité doit être postérieure ou égale à la date de début',
      path: ['validUntil'],
    }
  );

export const availabilityRuleUpdateSchema = availabilityRuleCreateSchema.extend({
  id: z.string().min(1, "L'identifiant de la règle est obligatoire"),
});

export const availabilityExceptionCreateSchema = z
  .object({
    practitionerId: z.string().min(1, 'Le praticien est obligatoire'),
    locationId: z.string().min(1, 'Le lieu est obligatoire'),
    localDate: z.string().regex(DATE_REGEX, 'Format de date invalide (YYYY-MM-DD)'),
    kind: z.enum(AVAILABILITY_EXCEPTION_KINDS, {
      message: "Type d'exception invalide ('open' ou 'closed')",
    }),
    startTime: z
      .string()
      .regex(TIME_REGEX, "Format d'heure de début invalide (HH:mm)")
      .nullable()
      .optional(),
    endTime: z
      .string()
      .regex(TIME_REGEX, "Format d'heure de fin invalide (HH:mm)")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      const hasStart = data.startTime !== undefined && data.startTime !== null && data.startTime.trim() !== '';
      const hasEnd = data.endTime !== undefined && data.endTime !== null && data.endTime.trim() !== '';
      // Both null (all-day exception) OR both present
      return (hasStart && hasEnd) || (!hasStart && !hasEnd);
    },
    {
      message: "Les heures de début et de fin doivent être toutes les deux renseignées ou toutes les deux laissées vides (journée entière)",
      path: ['endTime'],
    }
  )
  .refine(
    (data) => {
      const hasStart = data.startTime !== undefined && data.startTime !== null && data.startTime.trim() !== '';
      const hasEnd = data.endTime !== undefined && data.endTime !== null && data.endTime.trim() !== '';
      if (hasStart && hasEnd && data.startTime && data.endTime) {
        const start = data.startTime.slice(0, 5);
        const end = data.endTime.slice(0, 5);
        return start < end;
      }
      return true;
    },
    {
      message: "L'heure de début doit être strictement antérieure à l'heure de fin",
      path: ['endTime'],
    }
  );

export const availabilityExceptionUpdateSchema = availabilityExceptionCreateSchema.extend({
  id: z.string().min(1, "L'identifiant de l'exception est obligatoire"),
});

export const appointmentCreateSchema = z.object({
  patientId: z.string().min(1, 'Le patient est obligatoire'),
  practitionerId: z.string().min(1, 'Le praticien est obligatoire'),
  appointmentTypeId: z.string().min(1, 'Le type de séance est obligatoire'),
  locationId: z.string().min(1, 'Le lieu est obligatoire'),
  roomId: z.string().trim().nullable().optional(),
  localDate: z.string().regex(DATE_REGEX, 'Format de date invalide (YYYY-MM-DD)'),
  localStartTime: z.string().regex(TIME_REGEX, "Format d'heure invalide (HH:mm)"),
});

export const appointmentRescheduleSchema = appointmentCreateSchema.extend({
  appointmentId: z.string().min(1, "L'identifiant de la séance est obligatoire"),
});

export const appointmentCalendarRangeSchema = z
  .object({
    locationId: z.string().min(1, 'Le lieu est obligatoire'),
    practitionerId: z.string().nullable().optional(),
    startDate: z.string().regex(DATE_REGEX, 'Format de date de début invalide (YYYY-MM-DD)'),
    endDate: z.string().regex(DATE_REGEX, 'Format de date de fin invalide (YYYY-MM-DD)'),
  })
  .refine(
    (data) => data.startDate <= data.endDate,
    {
      message: 'La date de début doit être antérieure ou égale à la date de fin',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startDate + 'T00:00:00Z').getTime();
      const end = new Date(data.endDate + 'T00:00:00Z').getTime();
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
      return diffDays <= 93;
    },
    {
      message: 'La plage demandée ne peut pas dépasser 93 jours',
      path: ['endDate'],
    }
  );

export const patientSearchSchema = z.object({
  query: z.string().trim().min(1, 'Terme de recherche obligatoire'),
  limit: z.number().int().min(1).max(20).default(10),
});
