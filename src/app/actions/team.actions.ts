'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { auth } from '@/lib/auth/server';
import { requireProfessional, requireSession } from '@/lib/auth/session';
import { provisionSignupIdentity } from '@/lib/auth/provisioning';
import { AppError } from '@/lib/errors';
import {
  acceptTeamInvitation,
  createTeamInvitation,
  previewTeamInvitation,
  removeTeamMember,
  revokeTeamInvitation,
  setTeamMemberRole,
  type CreatedTeamInvitation,
} from '@/lib/services/team.service';
import {
  acceptTeamInvitationSchema,
  createTeamInvitationSchema,
  registerInvitedMemberSchema,
  teamInvitationIdSchema,
  teamMemberRoleSchema,
  teamMemberSchema,
} from '@/lib/validation/team.schemas';

// Résultat explicite : en production, Next.js masque le message des erreurs
// levées par une action.
export type TeamActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

function toResult(err: unknown): { ok: false; error: string; code?: string } {
  if (err instanceof AppError && err.statusCode < 500) return { ok: false, error: err.message, code: err.code };
  if (err instanceof ZodError) return { ok: false, error: err.issues[0]?.message ?? 'Données invalides', code: 'VALIDATION_ERROR' };
  throw err;
}

async function appBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && URL.canParse(configured)) return configured;
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const proto = requestHeaders.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : 'http://localhost:3000';
}

const TEAM_PATH = '/parametres/equipe';

export async function createTeamInvitationAction(input: unknown): Promise<TeamActionResult<CreatedTeamInvitation>> {
  try {
    const ctx = await requireProfessional();
    const values = createTeamInvitationSchema.parse(input);
    const created = await createTeamInvitation(ctx, values, await appBaseUrl());
    revalidatePath(TEAM_PATH);
    return { ok: true, data: created };
  } catch (err) {
    return toResult(err);
  }
}

export async function revokeTeamInvitationAction(input: unknown): Promise<TeamActionResult<{ revoked: boolean }>> {
  try {
    const ctx = await requireProfessional();
    const { invitationId } = teamInvitationIdSchema.parse(input);
    const revoked = await revokeTeamInvitation(ctx.organizationId, invitationId);
    revalidatePath(TEAM_PATH);
    return { ok: true, data: { revoked } };
  } catch (err) {
    return toResult(err);
  }
}

export async function setTeamMemberRoleAction(input: unknown): Promise<TeamActionResult<null>> {
  try {
    await requireProfessional();
    const { userId, role } = teamMemberRoleSchema.parse(input);
    await setTeamMemberRole(userId, role);
    revalidatePath(TEAM_PATH);
    return { ok: true, data: null };
  } catch (err) {
    return toResult(err);
  }
}

export async function removeTeamMemberAction(input: unknown): Promise<TeamActionResult<null>> {
  try {
    await requireProfessional();
    const { userId } = teamMemberSchema.parse(input);
    await removeTeamMember(userId);
    revalidatePath(TEAM_PATH);
    return { ok: true, data: null };
  } catch (err) {
    return toResult(err);
  }
}

/** Acceptation par le compte connecté (avec le jeton du lien, ou sans : par son adresse). */
export async function acceptTeamInvitationAction(input: unknown): Promise<TeamActionResult<{ destination: string }>> {
  try {
    const ctx = await requireSession();
    if (ctx.profileType !== 'professional') throw new AppError('Un compte professionnel est nécessaire.', 403, 'PROFESSIONAL_ACCOUNT_REQUIRED');
    const { token } = acceptTeamInvitationSchema.parse(input);
    await acceptTeamInvitation(token);
    return { ok: true, data: { destination: '/dashboard' } };
  } catch (err) {
    return toResult(err);
  }
}

/**
 * Création d'un compte depuis une invitation : compte professionnel sans
 * organisation propre, rattaché à l'équipe après vérification de l'adresse.
 * L'invitation doit être en attente et adressée à cette même adresse.
 */
export async function registerInvitedMemberAction(input: unknown): Promise<TeamActionResult<{ requiresEmailConfirmation: boolean }>> {
  try {
    const values = registerInvitedMemberSchema.parse(input);
    const preview = await previewTeamInvitation(values.token);
    if (!preview || preview.state !== 'pending') {
      throw new AppError('Cette invitation a expiré, a été retirée ou a déjà été utilisée. Demandez un nouveau lien.', 410, 'INVITATION_UNAVAILABLE');
    }
    if (preview.email !== values.email) {
      throw new AppError(`Cette invitation est adressée à ${preview.email}. Créez le compte avec cette adresse.`, 403, 'INVITATION_EMAIL_MISMATCH');
    }
    const { data: created, error } = await auth.signUp.email({ email: values.email, name: values.name, password: values.password });
    if (error || !created?.user) throw new AppError('Impossible de créer le compte.', 400, 'SIGNUP_FAILED');
    await provisionSignupIdentity(created.user.id, { profileType: 'professional' });
    return { ok: true, data: { requiresEmailConfirmation: !created.token } };
  } catch (err) {
    if (err instanceof AppError || err instanceof ZodError) return toResult(err);
    return { ok: false, error: 'Impossible de finaliser le compte. Réessayez ou contactez le support.', code: 'SIGNUP_FAILED' };
  }
}
