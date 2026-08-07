'use server';

import { invoiceService } from '@/lib/services/invoice.service';
import { requireProfessional, requireSession } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { assertQuota } from '@/lib/billing/quota';

/**
 * Server actions — devis et factures.
 *
 * Les paramètres préfixés par `_` sont conservés pour la compatibilité des
 * appelants, mais leur valeur est ignorée : l'organisation provient de la
 * session serveur (MS-002, MS-005, MS-006).
 *
 * Deux actions ont été RETIRÉES de la surface publique (MS-007) :
 *  - `markAsPaidAction` : le statut « payée » est désormais piloté
 *    exclusivement par le webhook Stripe, après vérification de signature.
 *  - `updateSignatureAction` : la signature passe par `/api/quotes/sign`,
 *    qui vérifie l'organisation et enregistre IP, horodatage et auteur.
 */

export async function findAllAction(_legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return invoiceService.findAll(organizationId);
}

export async function findByIdAction(id: string, _legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return invoiceService.findById(id, organizationId);
}

/**
 * Documents adressés au client connecté.
 * L'ancienne version acceptait un `clientId` arbitraire (IDOR).
 */
export async function findByClientAction(_legacyClientId?: unknown) {
  const { userId } = await requireSession();
  return invoiceService.findByClient(userId);
}

export async function findByProfessionalAction(_legacyProfessionalId?: unknown) {
  const { userId } = await requireSession();
  return invoiceService.findByProfessional(userId);
}

/**
 * Accès à un document par identifiant, sans filtre d'organisation.
 *
 * Réservé aux cas où le demandeur est le destinataire du document
 * (espace client). Le contrôle d'appartenance est fait ici.
 */
export async function getByIdAction(id: string) {
  const ctx = await requireSession();
  const invoice = await invoiceService.getById(id);
  if (!invoice) return null;

  const isOwner = ctx.organizationId && invoice.organizationId === ctx.organizationId;
  const isRecipient = invoice.clientId === ctx.userId || invoice.recipientUserId === ctx.userId || invoice.professionalId === ctx.userId;

  if (!isOwner && !isRecipient) {
    throw new AppError('Accès refusé à ce document', 403, 'FORBIDDEN');
  }

  return invoice;
}

export async function generateNumberAction(type: 'invoice' | 'quote', _legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return invoiceService.generateNumber(type, organizationId);
}

export async function getNextInvoiceNumberAction(
  _legacyOrganizationId?: unknown,
  type: 'invoice' | 'quote' = 'invoice',
) {
  const { organizationId } = await requireProfessional();
  return invoiceService.getNextInvoiceNumber(organizationId, type);
}

export async function calculateTotalsAction(invoiceId: string, _legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return invoiceService.calculateTotals(invoiceId, organizationId);
}

export async function createAction(
  data: Record<string, unknown>,
  lines: unknown[],
  _legacyUserId?: unknown,
) {
  const ctx = await requireProfessional();
  const { organizationId, userId } = ctx;

  // Devis et factures ont des compteurs mensuels distincts (MS-019).
  await assertQuota(ctx, data.type === 'quote' ? 'quotesPerMonth' : 'invoicesPerMonth');

  return invoiceService.create({ ...data, organizationId } as never, lines as never, userId);
}

/**
 * Création d'un devis depuis une demande Marketplace.
 * Cela génère automatiquement le Client CRM et le Deal si nécessaire.
 */
export async function createQuoteFromRequestAction(
  data: Record<string, unknown>,
  lines: unknown[]
) {
  const ctx = await requireProfessional();
  const { organizationId, userId } = ctx;

  await assertQuota(ctx, 'quotesPerMonth');

  // data.clientId here is the User ID of the marketplace client
  const requestUserId = data.clientId as string;
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
    name: (data as any).requestTitle || 'Demande Marketplace',
    value: (data as any).totalHT || 0,
    status: 'proposal',
    probability: 50,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }, userId);

  // Now create the invoice linked to the CRM client, but also save recipientUserId
  const invoiceData = {
    ...data,
    organizationId,
    clientId: crmClientId,
    recipientUserId: requestUserId, // Save for marketplace access
  };

  return invoiceService.create(invoiceData as never, lines as never, userId);
}

export async function updateAction(
  id: string,
  _legacyOrganizationId: unknown,
  data: Record<string, unknown>,
  _legacyUserId?: unknown,
) {
  const { organizationId, userId } = await requireProfessional();
  return invoiceService.update(id, organizationId, data as never, userId);
}

export async function deleteAction(id: string, _legacyOrganizationId?: unknown, _legacyUserId?: unknown) {
  const { organizationId, userId } = await requireProfessional();
  return invoiceService.delete(id, organizationId, userId);
}

export async function clientUpdateStatusAction(id: string, status: string) {
  const { userId } = await requireSession();
  await invoiceService.updateStatusAsClient(id, userId, status);
}
