import { z } from 'zod';

export const sendPatientPortalMessageSchema = z.object({
  patientId: z.string().min(1, 'Identifiant patient requis'),
  practitionerId: z.string().min(1, 'Identifiant praticien requis'),
  content: z.string().trim().min(1, 'Message requis').max(5000, 'Message trop long (max 5000 caractères)'),
});

export const sendPractitionerPatientMessageSchema = z.object({
  patientId: z.string().min(1, 'Identifiant patient requis'),
  portalUserId: z.string().min(1, 'Identifiant utilisateur portail requis'),
  content: z.string().trim().min(1, 'Message requis').max(5000, 'Message trop long (max 5000 caractères)'),
});
