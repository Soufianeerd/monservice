import { z } from 'zod';
import { PARAMEDICAL_PROFESSION_CODES } from '../workspaces/paramedical/professions';

export const practiceLocationCreateSchema = z.object({
  name: z.string().trim().min(1, 'Le nom du lieu est requis').max(100),
  address: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  postalCode: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  timezone: z.string().trim().default('Europe/Paris').refine((tz) => {
    if (!tz || tz.length > 50) return false;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz }).format();
      return true;
    } catch {
      return false;
    }
  }, { message: 'Fuseau horaire invalide' })
});

export const practiceLocationUpdateSchema = practiceLocationCreateSchema.partial();

export const practicePractitionerCreateSchema = z.object({
  displayName: z.string().trim().min(1, 'Le nom est requis').max(100),
  profession: z.enum(PARAMEDICAL_PROFESSION_CODES, {
    message: 'Profession invalide'
  }),
  userId: z.string().uuid('ID utilisateur invalide').nullable().optional(),
  email: z.string().trim().email('Email invalide').nullable().optional().or(z.literal('')),
  phone: z.string().trim().nullable().optional(),
});

export const practicePractitionerUpdateSchema = practicePractitionerCreateSchema.partial();

export const practiceRoomCreateSchema = z.object({
  locationId: z.string().uuid('Location invalide'),
  name: z.string().trim().min(1, 'Le nom de la salle est requis').max(100),
  description: z.string().trim().nullable().optional(),
});

export const practiceRoomUpdateSchema = practiceRoomCreateSchema.partial().omit({ locationId: true });

export const practiceResourceCreateSchema = z.object({
  locationId: z.string().uuid('Location invalide'),
  roomId: z.string().uuid('Salle invalide').nullable().optional(),
  name: z.string().trim().min(1, 'Le nom de la ressource est requis').max(100),
  description: z.string().trim().nullable().optional(),
});

export const practiceResourceUpdateSchema = practiceResourceCreateSchema.partial().omit({ locationId: true, roomId: true });

export const practitionerLocationAssignmentSchema = z.object({
  locationId: z.string().uuid('Location invalide'),
  isPrimary: z.boolean().default(false),
});

export const practitionerLocationsSetSchema = z.array(practitionerLocationAssignmentSchema)
  .refine(
    (assignments) => assignments.filter(a => a.isPrimary).length <= 1,
    { message: 'Un seul lieu principal autorisé' }
  );

export type PracticeLocationCreateInput = z.infer<typeof practiceLocationCreateSchema>;
export type PracticeLocationUpdateInput = z.infer<typeof practiceLocationUpdateSchema>;
export type PracticePractitionerCreateInput = z.infer<typeof practicePractitionerCreateSchema>;
export type PracticePractitionerUpdateInput = z.infer<typeof practicePractitionerUpdateSchema>;
export type PracticeRoomCreateInput = z.infer<typeof practiceRoomCreateSchema>;
export type PracticeRoomUpdateInput = z.infer<typeof practiceRoomUpdateSchema>;
export type PracticeResourceCreateInput = z.infer<typeof practiceResourceCreateSchema>;
export type PracticeResourceUpdateInput = z.infer<typeof practiceResourceUpdateSchema>;
export type PractitionerLocationAssignmentInput = z.infer<typeof practitionerLocationAssignmentSchema>;
export type PractitionerLocationsSetInput = z.infer<typeof practitionerLocationsSetSchema>;

