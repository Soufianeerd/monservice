import { z } from 'zod';

export const createClientPortalInvitationSchema = z.object({
  clientId: z.string().min(1, 'Client requis'),
  email: z
    .string()
    .trim()
    .max(320, 'Adresse e-mail trop longue')
    .email('Adresse e-mail invalide')
    .optional(),
});
export type CreateClientPortalInvitationInput = z.infer<typeof createClientPortalInvitationSchema>;

export const clientPortalClientIdSchema = z.object({ clientId: z.string().min(1, 'Client requis') });

export const clientPortalTokenSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Lien d’invitation invalide'),
});
