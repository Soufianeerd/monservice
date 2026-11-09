'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { requireFieldServiceContext } from '@/lib/workspaces/field-service/context';
import { AppError } from '@/lib/errors';
import {
  createFieldServiceAssetSchema,
  updateFieldServiceAssetSchema,
  workOrderAssetLinkSchema,
} from '@/lib/validation/field-service-assets.schemas';
import * as assetsService from '@/lib/services/field-service-assets.service';

// Session 19 — équipements clients (Field Service uniquement).
// En production, Next.js masque le message des erreurs levées par une Server
// Action : les erreurs métier attendues sont donc renvoyées explicitement.

export type AssetActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

async function run<T>(operation: () => Promise<T>): Promise<AssetActionResult<T>> {
  try {
    return { ok: true, data: await operation() };
  } catch (err) {
    if (err instanceof AppError && err.statusCode < 500) {
      return { ok: false, error: err.message, code: err.code };
    }
    if (err instanceof ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? 'Données invalides', code: 'VALIDATION_ERROR' };
    }
    throw err;
  }
}

export async function createFieldServiceAssetAction(rawInput: unknown) {
  return run(async () => {
    const ctx = await requireFieldServiceContext();
    const input = createFieldServiceAssetSchema.parse(rawInput);
    const asset = await assetsService.createFieldServiceAsset(ctx.organizationId, input);
    revalidatePath('/operations/equipements');
    return { id: asset.id };
  });
}

export async function updateFieldServiceAssetAction(rawInput: unknown) {
  return run(async () => {
    const ctx = await requireFieldServiceContext();
    const input = updateFieldServiceAssetSchema.parse(rawInput);
    await assetsService.updateFieldServiceAsset(ctx.organizationId, input);
    revalidatePath('/operations/equipements');
    revalidatePath(`/operations/equipements/${input.id}`);
    return { id: input.id };
  });
}

export async function linkAssetToWorkOrderAction(rawInput: unknown) {
  return run(async () => {
    const ctx = await requireFieldServiceContext();
    const input = workOrderAssetLinkSchema.parse(rawInput);
    await assetsService.linkAssetToWorkOrder(ctx.organizationId, input.workOrderId, input.assetId);
    revalidatePath(`/operations/${input.workOrderId}`);
    revalidatePath(`/operations/equipements/${input.assetId}`);
    return { linked: true as const };
  });
}

export async function unlinkAssetFromWorkOrderAction(rawInput: unknown) {
  return run(async () => {
    const ctx = await requireFieldServiceContext();
    const input = workOrderAssetLinkSchema.parse(rawInput);
    await assetsService.unlinkAssetFromWorkOrder(ctx.organizationId, input.workOrderId, input.assetId);
    revalidatePath(`/operations/${input.workOrderId}`);
    revalidatePath(`/operations/equipements/${input.assetId}`);
    return { linked: false as const };
  });
}
