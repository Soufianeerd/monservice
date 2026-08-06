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
  const isRecipient = invoice.clientId === ctx.userId || invoice.professionalId === ctx.userId;

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
