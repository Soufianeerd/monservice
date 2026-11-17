'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { requireProfessional } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { invoiceService } from '@/lib/services/invoice.service';
import { saveAutomationSettings } from '@/lib/services/automation.service';
import {
  replyToReview,
  reportReview,
  requestClientReview,
  revokeReviewRequest,
  submitReview,
  type ReviewRequestResult,
} from '@/lib/services/review.service';
import { deletePortfolioItem, savePortfolioItem, savePublicProfile } from '@/lib/services/public-profile.service';
import {
  automationSettingsSchema,
  portfolioIdSchema,
  portfolioItemSchema,
  publicProfileSchema,
  recordPaymentSchema,
  reviewReplySchema,
  reviewReportSchema,
  reviewRequestIdSchema,
  reviewRequestSchema,
  submitReviewSchema,
} from '@/lib/validation/growth.schemas';

// Résultat explicite : en production, Next.js masque le message des erreurs
// levées par une action.
export type GrowthActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string; code?: string };

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

export async function recordPaymentAction(input: unknown): Promise<GrowthActionResult> {
  try {
    const { organizationId, userId } = await requireProfessional();
    const values = recordPaymentSchema.parse(input);
    await invoiceService.recordManualPayment(values.invoiceId, organizationId, userId, values);
    revalidatePath('/facturation/factures');
    revalidatePath('/facturation/tresorerie');
    return { ok: true, data: null };
  } catch (err) {
    return toResult(err);
  }
}

export async function saveAutomationSettingsAction(input: unknown): Promise<GrowthActionResult> {
  try {
    await requireProfessional();
    await saveAutomationSettings(automationSettingsSchema.parse(input));
    revalidatePath('/parametres/relances');
    return { ok: true, data: null };
  } catch (err) {
    return toResult(err);
  }
}

export async function requestReviewAction(input: unknown): Promise<GrowthActionResult<ReviewRequestResult>> {
  try {
    const ctx = await requireProfessional();
    const { invoiceId } = reviewRequestSchema.parse(input);
    const result = await requestClientReview(ctx, invoiceId, await appBaseUrl());
    revalidatePath('/avis-clients');
    return { ok: true, data: result };
  } catch (err) {
    return toResult(err);
  }
}

export async function revokeReviewRequestAction(input: unknown): Promise<GrowthActionResult> {
  try {
    await requireProfessional();
    await revokeReviewRequest(reviewRequestIdSchema.parse(input).requestId);
    revalidatePath('/avis-clients');
    return { ok: true, data: null };
  } catch (err) {
    return toResult(err);
  }
}

export async function replyToReviewAction(input: unknown): Promise<GrowthActionResult> {
  try {
    await requireProfessional();
    const values = reviewReplySchema.parse(input);
    await replyToReview(values.reviewId, values.reply);
    revalidatePath('/avis-clients');
    return { ok: true, data: null };
  } catch (err) {
    return toResult(err);
  }
}

export async function reportReviewAction(input: unknown): Promise<GrowthActionResult> {
  try {
    await requireProfessional();
    const values = reviewReportSchema.parse(input);
    await reportReview(values.reviewId, values.reason);
    revalidatePath('/avis-clients');
    return { ok: true, data: null };
  } catch (err) {
    return toResult(err);
  }
}

/** Dépôt d'un avis par le titulaire du lien : aucune session, le jeton fait foi. */
export async function submitReviewAction(input: unknown): Promise<GrowthActionResult> {
  try {
    const values = submitReviewSchema.parse(input);
    await submitReview(values.token, values);
    return { ok: true, data: null };
  } catch (err) {
    return toResult(err);
  }
}

export async function savePublicProfileAction(input: unknown): Promise<GrowthActionResult<{ slug: string }>> {
  try {
    await requireProfessional();
    const values = publicProfileSchema.parse(input);
    await savePublicProfile(values);
    revalidatePath('/parametres/vitrine');
    revalidatePath(`/pro/${values.slug}`);
    return { ok: true, data: { slug: values.slug } };
  } catch (err) {
    return toResult(err);
  }
}

export async function savePortfolioItemAction(input: unknown): Promise<GrowthActionResult<{ id: string }>> {
  try {
    await requireProfessional();
    const values = portfolioItemSchema.parse(input);
    const id = await savePortfolioItem(values);
    revalidatePath('/parametres/vitrine');
    return { ok: true, data: { id } };
  } catch (err) {
    return toResult(err);
  }
}

export async function deletePortfolioItemAction(input: unknown): Promise<GrowthActionResult> {
  try {
    await requireProfessional();
    await deletePortfolioItem(portfolioIdSchema.parse(input).id);
    revalidatePath('/parametres/vitrine');
    return { ok: true, data: null };
  } catch (err) {
    return toResult(err);
  }
}
