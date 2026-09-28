'use server';

import { quoteService } from '@/lib/services/quote.service';
import { requireProfessional, requireSession } from '@/lib/auth/session';
import { requireFieldServiceContext } from '@/lib/workspaces/field-service/context';
import { assertQuota } from '@/lib/billing/quota';
import { revalidatePath } from 'next/cache';
import {
  createQuoteSchema,
  updateDraftQuoteSchema,
  sendQuoteSchema,
  markQuoteViewedSchema,
  acceptQuoteSchema,
  rejectQuoteSchema,
  createQuoteRevisionSchema,
  createDepositInvoiceSchema,
  convertQuoteToInvoiceSchema,
  createWorkOrderFromQuoteSchema,
  type CreateQuoteInput,
  type UpdateDraftQuoteInput,
  type SendQuoteInput,
  type MarkQuoteViewedInput,
  type AcceptQuoteInput,
  type RejectQuoteInput,
  type CreateQuoteRevisionInput,
  type CreateDepositInvoiceInput,
  type ConvertQuoteToInvoiceInput,
  type CreateWorkOrderFromQuoteInput,
} from '@/lib/validation/billing.schemas';
import { toClientQuoteDTO, type ClientQuoteDTO } from '@/lib/data/dto/client-billing.dto';
import type { Invoice } from '@/lib/data/interfaces/invoice.interface';

/**
 * Server Actions for canonical Quotes and Quote-to-Cash lifecycle.
 * All professional actions enforce requireProfessional() and derive organizationId on the server.
 */

export async function createQuoteAction(input: CreateQuoteInput): Promise<Invoice> {
  const ctx = await requireProfessional();
  await assertQuota(ctx, 'quotesPerMonth');

  const validated = createQuoteSchema.parse(input);

  const quote = await quoteService.createQuote(
    ctx.organizationId,
    ctx.userId,
    validated
  );

  revalidatePath('/facturation/devis');
  return quote;
}

export async function updateDraftQuoteAction(input: UpdateDraftQuoteInput): Promise<Invoice> {
  const { organizationId, userId } = await requireProfessional();
  const validated = updateDraftQuoteSchema.parse(input);

  const updated = await quoteService.updateDraftQuote(
    validated.id,
    organizationId,
    userId,
    validated
  );

  revalidatePath('/facturation/devis');
  revalidatePath(`/facturation/devis/${input.id}`);
  return updated;
}

export async function deleteDraftQuoteAction(quoteId: string): Promise<void> {
  const { organizationId, userId } = await requireProfessional();
  await quoteService.deleteDraftQuote(quoteId, organizationId, userId);
  revalidatePath('/facturation/devis');
}

export async function sendQuoteAction(input: SendQuoteInput): Promise<Invoice> {
  const { organizationId, userId } = await requireProfessional();
  const validated = sendQuoteSchema.parse(input);

  const sent = await quoteService.sendQuote(
    validated.quoteId,
    organizationId,
    userId
  );

  revalidatePath('/facturation/devis');
  revalidatePath(`/facturation/devis/${validated.quoteId}`);
  return sent;
}

export async function markQuoteViewedAction(input: MarkQuoteViewedInput): Promise<void> {
  const session = await requireSession();
  const validated = markQuoteViewedSchema.parse(input);

  await quoteService.markQuoteViewed(
    validated.quoteId,
    session.userId
  );

  revalidatePath(`/client/quotes/${validated.quoteId}`);
  revalidatePath(`/facturation/devis/${validated.quoteId}`);
}

export async function acceptQuoteAction(input: AcceptQuoteInput): Promise<Invoice> {
  const session = await requireSession();
  const validated = acceptQuoteSchema.parse(input);

  const accepted = await quoteService.acceptQuote(
    validated.quoteId,
    validated.signatureData,
    session.userId
  );

  revalidatePath(`/client/quotes/${validated.quoteId}`);
  revalidatePath(`/facturation/devis/${validated.quoteId}`);
  revalidatePath('/facturation/devis');
  return accepted;
}

export async function rejectQuoteAction(input: RejectQuoteInput): Promise<Invoice> {
  const session = await requireSession();
  const validated = rejectQuoteSchema.parse(input);

  const rejected = await quoteService.rejectQuote(
    validated.quoteId,
    validated.reason,
    session.userId
  );

  revalidatePath(`/client/quotes/${validated.quoteId}`);
  revalidatePath(`/facturation/devis/${validated.quoteId}`);
  revalidatePath('/facturation/devis');
  return rejected;
}

export async function createQuoteRevisionAction(input: CreateQuoteRevisionInput): Promise<Invoice> {
  const ctx = await requireProfessional();
  await assertQuota(ctx, 'quotesPerMonth');
  const validated = createQuoteRevisionSchema.parse(input);

  const revision = await quoteService.createQuoteRevision(
    validated.quoteId,
    ctx.organizationId,
    ctx.userId
  );

  revalidatePath('/facturation/devis');
  revalidatePath(`/facturation/devis/${validated.quoteId}`);
  revalidatePath(`/facturation/devis/${revision.id}`);
  return revision;
}

export async function createDepositInvoiceAction(input: CreateDepositInvoiceInput): Promise<Invoice> {
  const ctx = await requireProfessional();
  await assertQuota(ctx, 'invoicesPerMonth');
  const validated = createDepositInvoiceSchema.parse(input);

  const depositInvoice = await quoteService.createDepositInvoice(
    validated.quoteId,
    ctx.organizationId,
    ctx.userId,
    validated.dueDate
  );

  revalidatePath('/facturation/devis');
  revalidatePath('/facturation/factures');
  revalidatePath(`/facturation/factures/${depositInvoice.id}`);
  return depositInvoice;
}

export async function convertQuoteToInvoiceAction(input: ConvertQuoteToInvoiceInput): Promise<Invoice> {
  const ctx = await requireProfessional();
  await assertQuota(ctx, 'invoicesPerMonth');
  const validated = convertQuoteToInvoiceSchema.parse(input);

  const finalInvoice = await quoteService.convertQuoteToInvoice(
    validated.quoteId,
    ctx.organizationId,
    ctx.userId,
    validated.dueDate
  );

  revalidatePath('/facturation/devis');
  revalidatePath('/facturation/factures');
  revalidatePath(`/facturation/factures/${finalInvoice.id}`);
  return finalInvoice;
}

export async function createWorkOrderFromQuoteAction(input: CreateWorkOrderFromQuoteInput) {
  const ctx = await requireFieldServiceContext();
  const validated = createWorkOrderFromQuoteSchema.parse(input);

  const workOrder = await quoteService.createWorkOrderFromAcceptedQuote(
    ctx.organizationId,
    ctx.userId,
    validated
  );

  revalidatePath('/operations');
  revalidatePath(`/operations/${workOrder.id}`);
  revalidatePath(`/facturation/devis/${validated.quoteId}`);
  return workOrder;
}

export async function getQuoteAction(quoteId: string): Promise<Invoice | null> {
  const { organizationId } = await requireProfessional();
  return quoteService.getQuoteById(quoteId, organizationId);
}

export async function getClientQuoteAction(quoteId: string): Promise<ClientQuoteDTO | null> {
  const session = await requireSession();
  return quoteService.getClientQuote(quoteId, session.userId);
}
