import { z } from 'zod';
import { paramedicalProfessions } from '../workspaces/paramedical/professions';

export const practiceLocationCreateSchema = z.object({
  name: z.string().trim().min(1, 'Le nom du lieu est requis').max(100),
  address: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  postalCode: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  timezone: z.string().refine((tz) => {
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
  profession: z.enum(
    paramedicalProfessions.map(p => p.id) as [string, ...string[]], 
    { errorMap: () => ({ message: 'Profession invalide' }) }
  ),
  userId: z.string().uuid().nullable().optional(),
  email: z.string().email('Email invalide').nullable().optional().or(z.literal('')),
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
  roomId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1, 'Le nom de la ressource est requis').max(100),
  description: z.string().trim().nullable().optional(),
});

export const practiceResourceUpdateSchema = practiceResourceCreateSchema.partial().omit({ locationId: true, roomId: true });

export const practitionerLocationAssignmentSchema = z.object({
  locationId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
});

export const practitionerLocationsSetSchema = z.array(practitionerLocationAssignmentSchema);
