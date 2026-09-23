'use server';

import { revalidatePath } from 'next/cache';
import { requireFieldServiceContext } from '@/lib/workspaces/field-service/context';
import {
  createFieldServiceSiteSchema,
  updateFieldServiceSiteSchema,
  createFieldServiceWorkOrderSchema,
  updateFieldServiceWorkOrderSchema,
  scheduleFieldServiceWorkOrderSchema,
  transitionFieldServiceWorkOrderSchema,
  assignFieldServiceWorkerSchema,
  unassignFieldServiceWorkerSchema,
  createFieldServiceWorkReportSchema,
  updateFieldServiceWorkReportSchema,
  finalizeFieldServiceWorkReportSchema,
} from '@/lib/validation/field-service-operations.schemas';
import * as operationsService from '@/lib/services/field-service-operations.service';

// ============================================================================
// Site Actions
// ============================================================================

export async function createFieldServiceSiteAction(rawInput: unknown) {
  const ctx = await requireFieldServiceContext();
  const input = createFieldServiceSiteSchema.parse(rawInput);
  const site = await operationsService.createFieldServiceSite(ctx.organizationId, input);
  revalidatePath('/operations');
  revalidatePath('/operations/nouveau');
  return site;
}

export async function updateFieldServiceSiteAction(rawInput: unknown) {
  const ctx = await requireFieldServiceContext();
  const input = updateFieldServiceSiteSchema.parse(rawInput);
  const site = await operationsService.updateFieldServiceSite(ctx.organizationId, input.id, input);
  revalidatePath('/operations');
  return site;
}

// ============================================================================
// Work Order Actions
// ============================================================================

export async function createFieldServiceWorkOrderAction(rawInput: unknown) {
  const ctx = await requireFieldServiceContext();
  const input = createFieldServiceWorkOrderSchema.parse(rawInput);
  const order = await operationsService.createFieldServiceWorkOrder(
    ctx.organizationId,
    ctx.userId,
    input
  );
  revalidatePath('/operations');
  revalidatePath('/dashboard');
  return order;
}

export async function updateFieldServiceWorkOrderAction(rawInput: unknown) {
  const ctx = await requireFieldServiceContext();
  const input = updateFieldServiceWorkOrderSchema.parse(rawInput);
  const order = await operationsService.updateFieldServiceWorkOrder(
    ctx.organizationId,
    input.id,
    input
  );
  revalidatePath('/operations');
  revalidatePath(`/operations/${input.id}`);
  revalidatePath('/dashboard');
  return order;
}

export async function scheduleFieldServiceWorkOrderAction(rawInput: unknown) {
  const ctx = await requireFieldServiceContext();
  const input = scheduleFieldServiceWorkOrderSchema.parse(rawInput);
  const order = await operationsService.scheduleFieldServiceWorkOrder(
    ctx.organizationId,
    input.id,
    input.scheduledStart,
    input.scheduledEnd
  );
  revalidatePath('/operations');
  revalidatePath(`/operations/${input.id}`);
  revalidatePath('/dashboard');
  return order;
}

export async function transitionFieldServiceWorkOrderAction(rawInput: unknown) {
  const ctx = await requireFieldServiceContext();
  const input = transitionFieldServiceWorkOrderSchema.parse(rawInput);
  const order = await operationsService.transitionFieldServiceWorkOrder(
    ctx.organizationId,
    input.id,
    input.toStatus,
    input.cancellationReasonCode,
    input.cancellationNotes
  );
  revalidatePath('/operations');
  revalidatePath(`/operations/${input.id}`);
  revalidatePath('/dashboard');
  return order;
}

// ============================================================================
// Assignment Actions
// ============================================================================

export async function assignFieldServiceWorkerAction(rawInput: unknown) {
  const ctx = await requireFieldServiceContext();
  const input = assignFieldServiceWorkerSchema.parse(rawInput);
  const assignment = await operationsService.assignFieldServiceWorker(
    ctx.organizationId,
    input.workOrderId,
    input.userId,
    input.role
  );
  revalidatePath(`/operations/${input.workOrderId}`);
  return assignment;
}

export async function unassignFieldServiceWorkerAction(rawInput: unknown) {
  const ctx = await requireFieldServiceContext();
  const input = unassignFieldServiceWorkerSchema.parse(rawInput);
  const assignment = await operationsService.unassignFieldServiceWorker(
    ctx.organizationId,
    input.assignmentId
  );
  revalidatePath('/operations');
  return assignment;
}

// ============================================================================
// Work Report Actions
// ============================================================================

export async function createFieldServiceWorkReportAction(rawInput: unknown) {
  const ctx = await requireFieldServiceContext();
  const input = createFieldServiceWorkReportSchema.parse(rawInput);
  const report = await operationsService.createFieldServiceWorkReport(
    ctx.organizationId,
    ctx.userId,
    input
  );
  revalidatePath(`/operations/${input.workOrderId}`);
  return report;
}

export async function updateFieldServiceWorkReportAction(rawInput: unknown) {
  const ctx = await requireFieldServiceContext();
  const input = updateFieldServiceWorkReportSchema.parse(rawInput);
  const report = await operationsService.updateFieldServiceWorkReport(
    ctx.organizationId,
    input.id,
    input
  );
  revalidatePath('/operations');
  return report;
}

export async function finalizeFieldServiceWorkReportAction(rawInput: unknown) {
  const ctx = await requireFieldServiceContext();
  const input = finalizeFieldServiceWorkReportSchema.parse(rawInput);
  const report = await operationsService.finalizeFieldServiceWorkReport(
    ctx.organizationId,
    input.id
  );
  revalidatePath('/operations');
  return report;
}
