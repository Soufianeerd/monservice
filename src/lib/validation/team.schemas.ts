import { z } from 'zod';
import { passwordSchema } from '@/lib/validation/schemas';

const teamRoleSchema = z.enum(['admin', 'member'], { message: 'Rôle invalide' });
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Lien d’invitation invalide');

export const createTeamInvitationSchema = z
  .object({
    email: z.string().trim().toLowerCase().max(320, 'Adresse e-mail trop longue').email('Adresse e-mail invalide'),
    role: teamRoleSchema.default('member'),
  })
  .strict();

export const teamInvitationIdSchema = z.object({ invitationId: z.string().min(1, 'Invitation requise') }).strict();
export const teamMemberSchema = z.object({ userId: z.string().min(1, 'Membre requis') }).strict();
export const teamMemberRoleSchema = z.object({ userId: z.string().min(1, 'Membre requis'), role: teamRoleSchema }).strict();
export const acceptTeamInvitationSchema = z.object({ token: tokenSchema.nullable().default(null) }).strict();

export const registerInvitedMemberSchema = z
  .object({
    token: tokenSchema,
    name: z.string().trim().min(1, 'Le nom est requis').max(120),
    email: z.string().trim().toLowerCase().email('Email invalide').max(254),
    password: passwordSchema,
  })
  .strict();
