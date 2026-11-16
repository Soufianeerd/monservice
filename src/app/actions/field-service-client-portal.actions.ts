'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { requireProfileType } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { acknowledgeWorkReportSchema } from '@/lib/validation/field-service-client-portal.schemas';
import { acknowledgeWorkReport } from '@/lib/services/field-service-client-portal.service';

// Session 20 — réception des travaux par le client (résultat explicite : en
// production, Next.js masque le message des erreurs levées par une action).
export type PortalActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

export async function acknowledgeWorkReportAction(rawInput: unknown): Promise<PortalActionResult<{ workOrderId: string }>> {
  try {
    const ctx = await requireProfileType('client');
    const input = acknowledgeWorkReportSchema.parse(rawInput);
    const result = await acknowledgeWorkReport(ctx.userId, input);
    revalidatePath('/client/interventions');
    revalidatePath(`/client/interventions/${result.workOrderId}`);
    return { ok: true, data: result };
  } catch (err) {
    if (err instanceof AppError && err.statusCode < 500) return { ok: false, error: err.message, code: err.code };
    if (err instanceof ZodError) return { ok: false, error: err.issues[0]?.message ?? 'Données invalides', code: 'VALIDATION_ERROR' };
    throw err;
  }
}
