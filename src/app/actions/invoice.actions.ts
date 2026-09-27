'use server';

import { invoiceService } from '@/lib/services/invoice.service';
import { requireProfessional, requireSession } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { assertQuota } from '@/lib/billing/quota';
import type { Invoice, InvoiceLine, InvoiceStatus } from '@/lib/data/interfaces';

/**
 * Server actions — devis et factures.
 *
 * Les paramètres préfixés par `_` sont conservés pour la compatibilité des
 * appelants, mais leur valeur est ignorée : l'organisation provient de la
 * session serveur (MS-002, MS-005, MS-006).
 */

export async function findAllAction(_legacyOrganizationId?: unknown): Promise<Invoice[]> {
  const { organizationId } = await requireProfessional();
  return invoiceService.findAll(organizationId);
}

export async function findByIdAction(id: string, _legacyOrganizationId?: unknown): Promise<Invoice | null> {
  const { organizationId } = await requireProfessional();
  return invoiceService.findById(id, organizationId);
}

/**
 * Documents adressés au client connecté.
 */
export async function findByClientAction(_legacyClientId?: unknown): Promise<Invoice[]> {
  const { userId } = await requireSession();
  return invoiceService.findByClient(userId);
}

/**
 * Factures / devis de l'organisation professionnelle.
 */
export async function findByProfessionalAction(_legacyProfessionalId?: unknown): Promise<Invoice[]> {
  const { organizationId } = await requireProfessional();
  return invoiceService.findByProfessional(organizationId);
}

/**
 * Accès à un document par identifiant.
 * Réservé au professionnel émetteur ou au client destinataire légitime.
 */
export async function getByIdAction(id: string): Promise<Invoice | null> {
  const ctx = await requireSession();
  const invoice = await invoiceService.getById(id);
  if (!invoice) return null;

  const isOwner = Boolean(ctx.organizationId && invoice.organizationId === ctx.organizationId);
  let isRecipient = invoice.recipientUserId === ctx.userId || invoice.professionalId === ctx.userId;

  if (!isRecipient && ctx.profileType === 'client' && invoice.clientId) {
    const { clientService } = await import('@/lib/services/client.service');
    const client = await clientService.findById(invoice.clientId, invoice.organizationId);
    if (client?.userId === ctx.userId) {
      isRecipient = true;
    }
  }

  if (!isOwner && !isRecipient) {
    throw new AppError('Accès refusé à ce document', 403, 'FORBIDDEN');
  }

  return invoice;
}

export async function generateNumberAction(type: 'invoice' | 'quote', _legacyOrganizationId?: unknown): Promise<string> {
  const { organizationId } = await requireProfessional();
  return invoiceService.generateNumber(type, organizationId);
}

export async function getNextInvoiceNumberAction(
  _legacyOrganizationId?: unknown,
  type: 'invoice' | 'quote' = 'invoice',
): Promise<string> {
  const { organizationId } = await requireProfessional();
  return invoiceService.getNextInvoiceNumber(organizationId, type);
}

export async function calculateTotalsAction(invoiceId: string, _legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return invoiceService.calculateTotals(invoiceId, organizationId);
}

export async function createAction(
  data: Partial<Invoice> & { clientId: string },
  lines: (Omit<InvoiceLine, 'id' | 'invoiceId' | 'organizationId' | 'totalHT' | 'totalTTC'> & Partial<InvoiceLine>)[],
  _legacyUserId?: unknown,
): Promise<Invoice> {
  const ctx = await requireProfessional();
  const { organizationId, userId } = ctx;

  await assertQuota(ctx, data.type === 'quote' ? 'quotesPerMonth' : 'invoicesPerMonth');

  return invoiceService.create({ ...data, organizationId, clientId: data.clientId }, lines, userId);
}

/**
 * Création d'un devis depuis une demande Marketplace.
 * Cela génère automatiquement le Client CRM et le Deal si nécessaire.
 */
export async function createQuoteFromRequestAction(
  data: Partial<Invoice> & { requestTitle?: string },
  lines: (Omit<InvoiceLine, 'id' | 'invoiceId' | 'organizationId' | 'totalHT' | 'totalTTC'> & Partial<InvoiceLine>)[]
): Promise<Invoice> {
  const ctx = await requireProfessional();
  const { organizationId, userId } = ctx;

  await assertQuota(ctx, 'quotesPerMonth');

  const requestUserId = data.clientId;
  if (!requestUserId) throw new AppError('Client ID is required', 400);

  const { clientService } = await import('@/lib/services/client.service');
  const { dealService } = await import('@/lib/services/deal.service');
  const { userService } = await import('@/lib/services/user.service');
  const { db } = await import('@/lib/db/server');
  const { clients } = await import('@/lib/db/schema');
  const { and, eq } = await import('drizzle-orm');

  // Check if CRM client exists for this user in this organization
  const existingClients = await db.select().from(clients).where(
    and(eq(clients.userId, requestUserId), eq(clients.organizationId, organizationId))
  );

  let crmClientId: string;

  if (existingClients.length > 0) {
    crmClientId = existingClients[0].id;
  } else {
    // Create new CRM client based on User profile
    const clientUser = await userService.getUserProfile(requestUserId);
    if (!clientUser) throw new AppError('User not found', 404);

    const newClientData = {
      organizationId,
      userId: requestUserId,
      type: 'individual' as const,
      name: clientUser.name || 'Client',
      email: clientUser.email,
      status: 'lead' as const,
    };
    const newClient = await clientService.create(newClientData, userId);
    crmClientId = newClient.id;
  }

  // Create a Deal associated with this quote/request
  await dealService.create({
    organizationId,
    clientId: crmClientId,
    name: data.requestTitle || 'Demande Marketplace',
    value: data.totalHT || 0,
    status: 'proposal',
    probability: 50,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }, userId);

  // Now create the invoice linked to the CRM client, but also save recipientUserId
  const invoiceData: Partial<Invoice> & { organizationId: string; clientId: string } = {
    ...data,
    organizationId,
    clientId: crmClientId,
    recipientUserId: requestUserId,
    type: 'quote',
  };

  return invoiceService.create(invoiceData, lines, userId);
}

export async function updateAction(
  id: string,
  _legacyOrganizationId: unknown,
  data: Partial<Invoice>,
  _legacyUserId?: unknown,
): Promise<Invoice> {
  const { organizationId, userId } = await requireProfessional();
  return invoiceService.update(id, organizationId, data, userId);
}

export async function deleteAction(id: string, _legacyOrganizationId?: unknown, _legacyUserId?: unknown): Promise<void> {
  const { organizationId, userId } = await requireProfessional();
  return invoiceService.delete(id, organizationId, userId);
}

/**
 * @deprecated Use specific quote actions (markQuoteViewedAction, acceptQuoteAction, rejectQuoteAction) instead.
 */
export async function clientUpdateStatusAction(id: string, status: InvoiceStatus): Promise<void> {
  const { userId } = await requireSession();
  await invoiceService.updateStatusAsClient(id, userId, status);
}
