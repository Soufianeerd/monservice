'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { requireProfessional, requireProfileType } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import {
  clientPortalClientIdSchema,
  clientPortalTokenSchema,
  createClientPortalInvitationSchema,
} from '@/lib/validation/client-portal-invitation.schemas';
import {
  acceptClientPortalInvitation,
  createClientPortalInvitation,
  getClientPortalStatus,
  revokeClientPortalInvitation,
  unlinkClientPortalAccount,
  type ClientPortalStatus,
  type CreatedClientPortalInvitation,
} from '@/lib/services/client-portal-invitation.service';

// Résultat explicite : en production, Next.js masque le message des erreurs
// levées par une action.
export type ClientPortalActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

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

export async function getClientPortalStatusAction(rawInput: unknown): Promise<ClientPortalActionResult<ClientPortalStatus>> {
  try {
    const { organizationId } = await requireProfessional();
    const { clientId } = clientPortalClientIdSchema.parse(rawInput);
    return { ok: true, data: await getClientPortalStatus(organizationId, clientId) };
  } catch (err) {
    return toResult(err);
  }
}

export async function inviteClientToPortalAction(rawInput: unknown): Promise<ClientPortalActionResult<CreatedClientPortalInvitation>> {
  try {
    const { organizationId } = await requireProfessional();
    const input = createClientPortalInvitationSchema.parse(rawInput);
    const created = await createClientPortalInvitation(organizationId, input, await appBaseUrl());
    revalidatePath(`/clients/${input.clientId}`);
    return { ok: true, data: created };
  } catch (err) {
    return toResult(err);
  }
}

export async function revokeClientPortalInvitationAction(rawInput: unknown): Promise<ClientPortalActionResult<{ revoked: boolean }>> {
  try {
    const { organizationId } = await requireProfessional();
    const { clientId } = clientPortalClientIdSchema.parse(rawInput);
    const revoked = await revokeClientPortalInvitation(organizationId, clientId);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true, data: { revoked } };
  } catch (err) {
    return toResult(err);
  }
}

export async function unlinkClientPortalAccountAction(rawInput: unknown): Promise<ClientPortalActionResult<{ unlinked: boolean }>> {
  try {
    const { organizationId } = await requireProfessional();
    const { clientId } = clientPortalClientIdSchema.parse(rawInput);
    const unlinked = await unlinkClientPortalAccount(organizationId, clientId);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true, data: { unlinked } };
  } catch (err) {
    return toResult(err);
  }
}

export async function acceptClientPortalInvitationAction(rawInput: unknown): Promise<ClientPortalActionResult<{ accepted: true }>> {
  try {
    await requireProfileType('client');
    const { token } = clientPortalTokenSchema.parse(rawInput);
    await acceptClientPortalInvitation(token);
    revalidatePath('/client/dashboard');
    return { ok: true, data: { accepted: true } };
  } catch (err) {
    return toResult(err);
  }
}
