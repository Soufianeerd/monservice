import { z } from 'zod';
import { PATIENT_SEX_CODES, PATIENT_RELATIONSHIP_CODES } from './types';

// Helper to convert empty / whitespace-only string to null
const emptyToNull = (val: unknown): string | null => {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
};

// Date validation helper for YYYY-MM-DD
function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isNotFutureDate(dateStr: string): boolean {
  if (!isValidCalendarDate(dateStr)) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dateStr <= today;
}

const emailOptionalSchema = z
  .string()
  .nullish()
  .transform(emptyToNull)
  .refine(
    (val) => {
      if (val === null) return true;
      return z.string().email().safeParse(val).success;
    },
    { message: 'Format d’email invalide' }
  );

export const patientCreateSchema = z.object({
  birthName: z
    .string()
    .trim()
    .min(1, 'Le nom de naissance est requis')
    .max(100, 'Le nom de naissance ne doit pas dépasser 100 caractères'),
  firstBirthName: z
    .string()
    .trim()
    .min(1, 'Le premier prénom de naissance est requis')
    .max(100, 'Le premier prénom de naissance ne doit pas dépasser 100 caractères'),
  birthFirstNames: z.string().nullish().transform(emptyToNull),
  usedName: z.string().nullish().transform(emptyToNull),
  usedFirstName: z.string().nullish().transform(emptyToNull),
  birthDate: z
    .string()
    .trim()
    .min(1, 'La date de naissance est requise')
    .refine(isValidCalendarDate, { message: 'Date de naissance calendrier invalide (format attendu : AAAA-MM-JJ)' })
    .refine(isNotFutureDate, { message: 'La date de naissance ne peut pas être dans le futur' }),
  sex: z.enum(PATIENT_SEX_CODES),
  birthPlace: z.string().nullish().transform(emptyToNull),
  birthPlaceCode: z.string().nullish().transform(emptyToNull),
  birthCountry: z.string().nullish().transform(emptyToNull),
  email: emailOptionalSchema,
  phone: z.string().nullish().transform(emptyToNull),
  address: z.string().nullish().transform(emptyToNull),
  city: z.string().nullish().transform(emptyToNull),
  postalCode: z.string().nullish().transform(emptyToNull),
  country: z.string().nullish().transform(emptyToNull),
});

export const patientUpdateSchema = patientCreateSchema.partial();

export const patientRepresentativeCreateSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'Le prénom est requis')
    .max(100, 'Le prénom ne doit pas dépasser 100 caractères'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
  email: emailOptionalSchema,
  phone: z.string().nullish().transform(emptyToNull),
  address: z.string().nullish().transform(emptyToNull),
  city: z.string().nullish().transform(emptyToNull),
  postalCode: z.string().nullish().transform(emptyToNull),
  country: z.string().nullish().transform(emptyToNull),
});

export const patientRepresentativeUpdateSchema = patientRepresentativeCreateSchema.partial();

export const patientRepresentativeLinkCreateSchema = z.object({
  relationship: z.enum(PATIENT_RELATIONSHIP_CODES),
  isLegalRepresentative: z.boolean().default(false),
  isPrimaryContact: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  isBillingContact: z.boolean().default(false),
});

export const patientRepresentativeLinkUpdateSchema = z.object({
  relationship: z.enum(PATIENT_RELATIONSHIP_CODES).optional(),
  isLegalRepresentative: z.boolean().optional(),
  isPrimaryContact: z.boolean().optional(),
  isEmergencyContact: z.boolean().optional(),
  isBillingContact: z.boolean().optional(),
});

const birthDateFilterSchema = z
  .string()
  .nullish()
  .transform(emptyToNull)
  .refine(
    (val) => {
      if (val === null) return true;
      return isValidCalendarDate(val);
    },
    { message: 'Format ou calendrier de date de naissance invalide (AAAA-MM-JJ attendu)' }
  );

export const patientListFiltersSchema = z.object({
  birthName: z.string().nullish().transform(emptyToNull),
  firstName: z.string().nullish().transform(emptyToNull),
  birthDate: birthDateFilterSchema,
  active: z.enum(['active', 'archived', 'all']).default('active'),
  limit: z.coerce.number().int().positive().max(100).default(25),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;
export type PatientRepresentativeCreateInput = z.infer<typeof patientRepresentativeCreateSchema>;
export type PatientRepresentativeUpdateInput = z.infer<typeof patientRepresentativeUpdateSchema>;
export type PatientRepresentativeLinkCreateInput = z.infer<typeof patientRepresentativeLinkCreateSchema>;
export type PatientRepresentativeLinkUpdateInput = z.infer<typeof patientRepresentativeLinkUpdateSchema>;
export type PatientListFiltersInput = z.infer<typeof patientListFiltersSchema>;
