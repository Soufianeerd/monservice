import 'server-only';
import { db } from '../db/server';
import {
  invoices,
  invoiceLines,
  invoiceSections,
  billingDocumentSequences,
  clients,
  deals,
  fieldServiceSites,
  fieldServiceWorkOrders,
  users,
} from '../db/schema';
import { eq, and, sql, desc, or, inArray, asc } from 'drizzle-orm';
import { generateId } from '../utils/id-generator';
import { Invoice, InvoiceLine, InvoiceSection } from '../data/interfaces';
import { AppError } from '@/lib/errors';
import { userService } from './user.service';
import {
  calculateDocumentTotals,
  calculateDepositInvoiceLines,
  roundMoney,
} from './billing-calculator';
import {
  createQuoteSchema,
  updateDraftQuoteSchema,
  createWorkOrderFromQuoteSchema,
} from '../validation/billing.schemas';
import { z } from 'zod';
import { toClientQuoteDTO, ClientQuoteDTO } from '../data/dto/client-billing.dto';
import { invoiceService } from './invoice.service';
import { assertFeature, getUserPlan } from '@/lib/billing/quota';

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function allocateBillingNumber(
  tx: DbTx,
  organizationId: string,
  type: 'invoice' | 'quote',
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = type === 'invoice' ? 'F' : 'D';
  const [row] = await tx
    .insert(billingDocumentSequences)
    .values({
      organizationId,
      documentType: type,
      year,
      lastSequence: 1,
    })
    .onConflictDoUpdate({
      target: [
        billingDocumentSequences.organizationId,
        billingDocumentSequences.documentType,
        billingDocumentSequences.year,
      ],
      set: {
        lastSequence: sql`${billingDocumentSequences.lastSequence} + 1`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ lastSequence: billingDocumentSequences.lastSequence });

  const seq = row?.lastSequence ?? 1;
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

export const quoteService = {
  /**
   * Création transactionnelle d'un devis canonique avec sections et lignes.
   */
  async createQuote(
    organizationId: string,
    userId: string,
    input: z.infer<typeof createQuoteSchema>
  ): Promise<Invoice> {
    const validated = createQuoteSchema.parse(input);

    return await db.transaction(async (tx) => {
      // 1. Validation de l'appartenance du client
      const [client] = await tx
        .select({ id: clients.id, userId: clients.userId })
        .from(clients)
        .where(and(eq(clients.id, validated.clientId), eq(clients.organizationId, organizationId)))
        .limit(1);

      if (!client) {
        throw new AppError('Client introuvable dans cette organisation', 404, 'CLIENT_NOT_FOUND');
      }

      // 2. Validation du site si fourni (doit appartenir à l'organisation ET au client)
      if (validated.siteId) {
        const [site] = await tx
          .select({ id: fieldServiceSites.id })
          .from(fieldServiceSites)
          .where(
            and(
              eq(fieldServiceSites.id, validated.siteId),
              eq(fieldServiceSites.organizationId, organizationId),
              eq(fieldServiceSites.clientId, validated.clientId)
            )
          )
          .limit(1);

        if (!site) {
          throw new AppError('Site introuvable pour ce client', 400, 'INVALID_SITE_FOR_CLIENT');
        }
      }

      // 3. Validation du deal si fourni
      if (validated.dealId) {
        const [deal] = await tx
          .select({ id: deals.id })
          .from(deals)
          .where(
            and(
              eq(deals.id, validated.dealId),
              eq(deals.organizationId, organizationId),
              eq(deals.clientId, validated.clientId)
            )
          )
          .limit(1);

        if (!deal) {
          throw new AppError('Deal introuvable pour ce client', 400, 'INVALID_DEAL_FOR_CLIENT');
        }
      }

      // 4. Calcul déterministe serveur des totaux
      const totals = calculateDocumentTotals(validated.lines, {
        depositMode: validated.depositMode,
        depositRate: validated.depositRate,
        depositFixedAmount: validated.depositFixedAmount,
      });

      // 5. Allocation atomique du numéro
      const number = await allocateBillingNumber(tx, organizationId, 'quote');
      const quoteId = generateId();
      const now = new Date().toISOString();

      // 6. Insertion du devis parent
      await tx.insert(invoices).values({
        id: quoteId,
        organizationId,
        clientId: validated.clientId,
        recipientUserId: client.userId || null,
        type: 'quote',
        number,
        title: validated.title || null,
        date: validated.date || now,
        validUntil: validated.validUntil || null,
        message: validated.message || null,
        status: 'draft',
        invoiceSubtype: 'standard',
        createdByUserId: userId,
        dealId: validated.dealId || null,
        siteId: validated.siteId || null,
        totalHT: totals.totalHT,
        taxAmount: totals.taxAmount,
        totalTTC: totals.totalTTC,
        depositMode: validated.depositMode,
        depositRate: validated.depositRate ?? null,
        depositFixedAmount: validated.depositFixedAmount ?? null,
        depositAmount: totals.depositAmount,
        prepaidAmount: 0,
        amountDue: totals.totalTTC,
        revisionNumber: 1,
        createdAt: now,
        updatedAt: now,
      });

      // 7. Insertion des sections
      const sectionIdMap = new Map<string, string>();
      if (validated.sections && validated.sections.length > 0) {
        for (let i = 0; i < validated.sections.length; i++) {
          const s = validated.sections[i];
          const newSectionId = generateId();
          if (s.id) sectionIdMap.set(s.id, newSectionId);

          const parentId = s.parentSectionId ? sectionIdMap.get(s.parentSectionId) || null : null;

          await tx.insert(invoiceSections).values({
            id: newSectionId,
            organizationId,
            invoiceId: quoteId,
            parentSectionId: parentId,
            kind: s.kind,
            title: s.title,
            description: s.description || null,
            position: s.position ?? i,
            isOptional: s.isOptional ?? false,
            optionGroupKey: s.optionGroupKey || null,
            isSelected: s.isSelected ?? true,
          });
        }
      }

      // 8. Insertion des lignes
      for (let i = 0; i < totals.lines.length; i++) {
        const l = totals.lines[i];
        const lineId = generateId();
        const mappedSectionId = l.sectionId ? (sectionIdMap.get(l.sectionId) || l.sectionId) : null;

        await tx.insert(invoiceLines).values({
          id: lineId,
          organizationId,
          invoiceId: quoteId,
          sectionId: mappedSectionId,
          description: l.description,
          lineType: l.lineType || 'service',
          unitCode: l.unitCode || 'unit',
          position: i,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountRate: l.discountRate,
          unitCost: l.unitCost ?? null,
          taxRate: l.taxRate,
          taxAmount: l.taxAmount,
          totalHT: l.totalHT,
          totalTTC: l.totalTTC,
        });
      }

      // 9. Chargement complet
      const created = await this.getQuoteById(quoteId, organizationId, tx);
      if (!created) throw new AppError('Erreur lors de la création du devis', 500);
      return created;
    });
  },

  /**
   * Lecture d'un devis avec sections et lignes (contexte professionnel).
   */
  async getQuoteById(quoteId: string, organizationId: string, customDb: DbTx | typeof db = db): Promise<Invoice | null> {
    const [inv] = await customDb
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, quoteId), eq(invoices.organizationId, organizationId), eq(invoices.type, 'quote')))
      .limit(1);

    if (!inv) return null;

    const sections = await customDb
      .select()
      .from(invoiceSections)
      .where(eq(invoiceSections.invoiceId, quoteId))
      .orderBy(asc(invoiceSections.position));

    const lines = await customDb
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, quoteId))
      .orderBy(asc(invoiceLines.position));

    return {
      ...inv,
      type: 'quote',
      status: inv.status,
      invoiceSubtype: inv.invoiceSubtype ?? 'standard',
      depositMode: inv.depositMode ?? 'none',
      sections: sections.map((s) => ({
        ...s,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
        updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
      })),
      lines,
    };
  },

  /**
   * Modification transactionnelle d'un brouillon de devis.
   */
  async updateDraftQuote(
    quoteId: string,
    organizationId: string,
    userId: string,
    input: z.infer<typeof updateDraftQuoteSchema>
  ): Promise<Invoice> {
    const validated = updateDraftQuoteSchema.parse(input);

    return await db.transaction(async (tx) => {
      const existing = await this.getQuoteById(quoteId, organizationId, tx);
      if (!existing) throw new AppError('Devis introuvable', 404);
      if (existing.status !== 'draft') {
        throw new AppError('Seul un devis au statut brouillon peut être modifié', 400, 'NOT_DRAFT');
      }

      const clientId = validated.clientId || existing.clientId;

      // Validation du site si fourni
      const siteId = validated.siteId !== undefined ? validated.siteId : existing.siteId;
      if (siteId) {
        const [site] = await tx
          .select({ id: fieldServiceSites.id })
          .from(fieldServiceSites)
          .where(
            and(
              eq(fieldServiceSites.id, siteId),
              eq(fieldServiceSites.organizationId, organizationId),
              eq(fieldServiceSites.clientId, clientId)
            )
          )
          .limit(1);

        if (!site) {
          throw new AppError('Site introuvable pour ce client', 400, 'INVALID_SITE_FOR_CLIENT');
        }
      }

      // Validation du deal si fourni
      const dealId = validated.dealId !== undefined ? validated.dealId : existing.dealId;
      if (dealId) {
        const [deal] = await tx
          .select({ id: deals.id })
          .from(deals)
          .where(
            and(
              eq(deals.id, dealId),
              eq(deals.organizationId, organizationId),
              eq(deals.clientId, clientId)
            )
          )
          .limit(1);

        if (!deal) {
          throw new AppError('Deal introuvable pour ce client', 400, 'INVALID_DEAL_FOR_CLIENT');
        }
      }

      const linesToCalculate = validated.lines || existing.lines;
      const depositMode = validated.depositMode || existing.depositMode || 'none';
      const depositRate = validated.depositRate !== undefined ? validated.depositRate : existing.depositRate;
      const depositFixedAmount =
        validated.depositFixedAmount !== undefined
          ? validated.depositFixedAmount
          : existing.depositFixedAmount;

      const totals = calculateDocumentTotals(linesToCalculate, {
        depositMode,
        depositRate,
        depositFixedAmount,
      });

      const now = new Date().toISOString();

      await tx
        .update(invoices)
        .set({
          clientId,
          title: validated.title !== undefined ? validated.title : existing.title,
          date: validated.date !== undefined ? validated.date : existing.date,
          validUntil: validated.validUntil !== undefined ? validated.validUntil : existing.validUntil,
          message: validated.message !== undefined ? validated.message : existing.message,
          siteId,
          dealId,
          totalHT: totals.totalHT,
          taxAmount: totals.taxAmount,
          totalTTC: totals.totalTTC,
          depositMode,
          depositRate: depositRate ?? null,
          depositFixedAmount: depositFixedAmount ?? null,
          depositAmount: totals.depositAmount,
          amountDue: totals.totalTTC,
          updatedAt: now,
        })
        .where(eq(invoices.id, quoteId));

      // Remplacement transactionnel des sections si fournies
      const sectionIdMap = new Map<string, string>();
      if (validated.sections) {
        await tx.delete(invoiceSections).where(eq(invoiceSections.invoiceId, quoteId));
        for (let i = 0; i < validated.sections.length; i++) {
          const s = validated.sections[i];
          const newSectionId = generateId();
          if (s.id) sectionIdMap.set(s.id, newSectionId);

          const parentId = s.parentSectionId ? sectionIdMap.get(s.parentSectionId) || null : null;

          await tx.insert(invoiceSections).values({
            id: newSectionId,
            organizationId,
            invoiceId: quoteId,
            parentSectionId: parentId,
            kind: s.kind,
            title: s.title,
            description: s.description || null,
            position: s.position ?? i,
            isOptional: s.isOptional ?? false,
            optionGroupKey: s.optionGroupKey || null,
            isSelected: s.isSelected ?? true,
          });
        }
      }

      // Remplacement transactionnel des lignes si fournies
      if (validated.lines) {
        await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, quoteId));
        for (let i = 0; i < totals.lines.length; i++) {
          const l = totals.lines[i];
          const lineId = generateId();
          const mappedSectionId = l.sectionId ? (sectionIdMap.get(l.sectionId) || l.sectionId) : null;

          await tx.insert(invoiceLines).values({
            id: lineId,
            organizationId,
            invoiceId: quoteId,
            sectionId: mappedSectionId,
            description: l.description,
            lineType: l.lineType || 'service',
            unitCode: l.unitCode || 'unit',
            position: i,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountRate: l.discountRate,
            unitCost: l.unitCost ?? null,
            taxRate: l.taxRate,
            taxAmount: l.taxAmount,
            totalHT: l.totalHT,
            totalTTC: l.totalTTC,
          });
        }
      }

      const updated = await this.getQuoteById(quoteId, organizationId, tx);
      if (!updated) throw new AppError('Erreur de mise à jour', 500);
      return updated;
    });
  },

  /**
   * Suppression sécurisée d'un brouillon de devis non verrouillé.
   */
  async deleteDraftQuote(quoteId: string, organizationId: string, userId: string): Promise<void> {
    const quote = await this.getQuoteById(quoteId, organizationId);
    if (!quote) throw new AppError('Devis introuvable', 404);
    if (quote.status !== 'draft') {
      throw new AppError('Seul un devis au statut brouillon peut être supprimé', 400);
    }

    await db.transaction(async (tx) => {
      await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, quoteId));
      await tx.delete(invoiceSections).where(eq(invoiceSections.invoiceId, quoteId));
      await tx
        .delete(invoices)
        .where(and(eq(invoices.id, quoteId), eq(invoices.organizationId, organizationId)));
    });
  },

  /**
   * Passage au statut envoyé ('sent').
   */
  async sendQuote(quoteId: string, organizationId: string, userId: string): Promise<Invoice> {
    const quote = await this.getQuoteById(quoteId, organizationId);
    if (!quote) throw new AppError('Devis introuvable', 404);
    if (quote.status !== 'draft') {
      throw new AppError('Seul un brouillon peut être envoyé', 400);
    }

    const now = new Date().toISOString();
    await db
      .update(invoices)
      .set({ status: 'sent', updatedAt: now })
      .where(and(eq(invoices.id, quoteId), eq(invoices.organizationId, organizationId)));

    return (await this.getQuoteById(quoteId, organizationId))!;
  },

  /**
   * Marque le devis comme consulté par le destinataire ('viewed').
   */
  async markQuoteViewed(quoteId: string, recipientUserId: string): Promise<void> {
    const [quote] = await db
      .select({
        id: invoices.id,
        status: invoices.status,
        recipientUserId: invoices.recipientUserId,
        clientId: invoices.clientId,
      })
      .from(invoices)
      .where(and(eq(invoices.id, quoteId), eq(invoices.type, 'quote')))
      .limit(1);

    if (!quote) return;

    let isAuthorized = quote.recipientUserId === recipientUserId;
    if (!isAuthorized) {
      const [crmClient] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, quote.clientId), eq(clients.userId, recipientUserId)))
        .limit(1);
      if (crmClient) isAuthorized = true;
    }

    if (!isAuthorized) return;

    if (quote.status === 'sent') {
      await db
        .update(invoices)
        .set({ status: 'viewed', updatedAt: new Date().toISOString() })
        .where(eq(invoices.id, quoteId));
    }
  },

  /**
   * Signature atomique et acceptation d'un devis.
   */
  async acceptQuote(
    quoteId: string,
    signatureData: string,
    signerUserId: string,
    ipAddress: string | null = null,
    userAgent: string | null = null
  ): Promise<Invoice> {
    return await db.transaction(async (tx) => {
      const [quote] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, quoteId), eq(invoices.type, 'quote')))
        .limit(1);

      if (!quote) throw new AppError('Devis introuvable', 404);
      if (quote.status !== 'sent' && quote.status !== 'viewed') {
        throw new AppError(`Le devis ne peut pas être accepté dans son statut actuel (${quote.status})`, 400);
      }
      if (quote.signature) {
        throw new AppError('Ce devis est déjà signé', 409, 'ALREADY_SIGNED');
      }

      // Vérification de l'entitlement signature électronique sur l'organisation émettrice
      const [orgOwner] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.organizationId, quote.organizationId))
        .limit(1);

      if (orgOwner) {
        const plan = await getUserPlan(orgOwner.id);
        if (!plan.features.electronicSignature) {
          throw new AppError('Signature non autorisée par le plan du professionnel', 403, 'FEATURE_NOT_ALLOWED');
        }
      }

      const now = new Date().toISOString();

      await tx
        .update(invoices)
        .set({
          status: 'accepted',
          signature: signatureData,
          signatureIp: ipAddress,
          signatureDate: now,
          signedAt: now,
          acceptedAt: now,
          acceptedByUserId: signerUserId,
          updatedAt: now,
        })
        .where(eq(invoices.id, quoteId));

      // Si rattaché à un Deal commercial, on le passe à 'won'
      if (quote.dealId) {
        await tx
          .update(deals)
          .set({ status: 'won', updatedAt: now })
          .where(and(eq(deals.id, quote.dealId), eq(deals.organizationId, quote.organizationId)));
      }

      console.info('[audit] quote.accepted', {
        quoteId,
        signerUserId,
        ip: ipAddress,
        at: now,
      });

      return (await this.getQuoteById(quoteId, quote.organizationId, tx))!;
    });
  },

  /**
   * Refus explicite d'un devis par le client.
   */
  async rejectQuote(quoteId: string, reason: string | null | undefined, clientUserId: string): Promise<Invoice> {
    return await db.transaction(async (tx) => {
      const [quote] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, quoteId), eq(invoices.type, 'quote')))
        .limit(1);

      if (!quote) throw new AppError('Devis introuvable', 404);
      if (quote.status !== 'sent' && quote.status !== 'viewed') {
        throw new AppError(`Ce devis ne peut pas être refusé dans son statut actuel (${quote.status})`, 400);
      }

      const now = new Date().toISOString();
      const updatedMessage = reason
        ? quote.message
          ? `${quote.message}\nMotif du refus : ${reason}`
          : `Motif du refus : ${reason}`
        : quote.message;

      await tx
        .update(invoices)
        .set({
          status: 'rejected',
          rejectedAt: now,
          rejectedByUserId: clientUserId,
          message: updatedMessage,
          updatedAt: now,
        })
        .where(eq(invoices.id, quoteId));

      if (quote.dealId) {
        await tx
          .update(deals)
          .set({ status: 'lost', updatedAt: now })
          .where(and(eq(deals.id, quote.dealId), eq(deals.organizationId, quote.organizationId)));
      }

      return (await this.getQuoteById(quoteId, quote.organizationId, tx))!;
    });
  },

  /**
   * Révision d'un devis : archive l'ancien ('superseded') et crée une nouvelle révision draft.
   */
  async createQuoteRevision(quoteId: string, organizationId: string, userId: string): Promise<Invoice> {
    return await db.transaction(async (tx) => {
      const prev = await this.getQuoteById(quoteId, organizationId, tx);
      if (!prev) throw new AppError('Devis introuvable', 404);
      if (prev.status === 'superseded') {
        throw new AppError('Ce devis a déjà été remplacé par une révision ultérieure', 400);
      }

      const now = new Date().toISOString();

      // Marquer l'ancien comme superseded
      await tx
        .update(invoices)
        .set({ status: 'superseded', updatedAt: now })
        .where(eq(invoices.id, prev.id));

      const newNumber = await allocateBillingNumber(tx, organizationId, 'quote');
      const newQuoteId = generateId();
      const nextRevision = (prev.revisionNumber ?? 1) + 1;

      await tx.insert(invoices).values({
        id: newQuoteId,
        organizationId,
        clientId: prev.clientId,
        recipientUserId: prev.recipientUserId || null,
        type: 'quote',
        number: newNumber,
        title: prev.title,
        date: now.split('T')[0],
        validUntil: prev.validUntil || null,
        message: prev.message || null,
        status: 'draft',
        invoiceSubtype: 'standard',
        createdByUserId: userId,
        dealId: prev.dealId || null,
        siteId: prev.siteId || null,
        sourceQuoteId: prev.id,
        supersedesDocumentId: prev.id,
        revisionNumber: nextRevision,
        totalHT: prev.totalHT,
        taxAmount: prev.taxAmount,
        totalTTC: prev.totalTTC,
        depositMode: prev.depositMode || 'none',
        depositRate: prev.depositRate ?? null,
        depositFixedAmount: prev.depositFixedAmount ?? null,
        depositAmount: prev.depositAmount ?? 0,
        prepaidAmount: 0,
        amountDue: prev.totalTTC,
        createdAt: now,
        updatedAt: now,
      });

      // Cloner sections
      const sectionMap = new Map<string, string>();
      if (prev.sections && prev.sections.length > 0) {
        for (const s of prev.sections) {
          const newSecId = generateId();
          sectionMap.set(s.id, newSecId);
          await tx.insert(invoiceSections).values({
            id: newSecId,
            organizationId,
            invoiceId: newQuoteId,
            parentSectionId: s.parentSectionId ? sectionMap.get(s.parentSectionId) || null : null,
            kind: s.kind,
            title: s.title,
            description: s.description || null,
            position: s.position,
            isOptional: s.isOptional,
            optionGroupKey: s.optionGroupKey || null,
            isSelected: s.isSelected,
          });
        }
      }

      // Cloner lignes
      if (prev.lines && prev.lines.length > 0) {
        for (const l of prev.lines) {
          await tx.insert(invoiceLines).values({
            id: generateId(),
            organizationId,
            invoiceId: newQuoteId,
            sectionId: l.sectionId ? sectionMap.get(l.sectionId) || null : null,
            sourceLineId: l.id,
            description: l.description,
            lineType: l.lineType || 'service',
            unitCode: l.unitCode || 'unit',
            position: l.position || 0,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountRate: l.discountRate || 0,
            unitCost: l.unitCost ?? null,
            taxRate: l.taxRate,
            taxAmount: l.taxAmount || 0,
            totalHT: l.totalHT,
            totalTTC: l.totalTTC,
          });
        }
      }

      return (await this.getQuoteById(newQuoteId, organizationId, tx))!;
    });
  },

  /**
   * Création d'une facture d'acompte à partir d'un devis accepté (Zero Re-entry).
   */
  async createDepositInvoice(
    quoteId: string,
    organizationId: string,
    userId: string,
    dueDate?: string | null
  ): Promise<Invoice> {
    return await db.transaction(async (tx) => {
      const quote = await this.getQuoteById(quoteId, organizationId, tx);
      if (!quote) throw new AppError('Devis introuvable', 404);
      if (quote.status !== 'accepted') {
        throw new AppError("Une facture d'acompte exige un devis accepté", 400, 'QUOTE_NOT_ACCEPTED');
      }

      const depositAmount = Number(quote.depositAmount) || 0;
      if (depositAmount <= 0) {
        throw new AppError("Ce devis n'exige aucun acompte", 400, 'NO_DEPOSIT_REQUIRED');
      }

      // Idempotence : vérifier si une facture d'acompte existe déjà pour ce devis
      const existingDeposits = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.sourceQuoteId, quoteId),
            eq(invoices.organizationId, organizationId),
            eq(invoices.invoiceSubtype, 'deposit')
          )
        )
        .limit(1);

      if (existingDeposits.length > 0) {
        return (await invoiceService.findById(existingDeposits[0].id, organizationId))!;
      }

      const quoteTotals = calculateDocumentTotals(quote.lines, {
        depositMode: quote.depositMode,
        depositRate: quote.depositRate,
        depositFixedAmount: quote.depositFixedAmount,
      });

      const depositLines = calculateDepositInvoiceLines(quoteTotals, depositAmount, quote.number);

      const invoiceNumber = await allocateBillingNumber(tx, organizationId, 'invoice');
      const invoiceId = generateId();
      const now = new Date().toISOString();

      let sumHT = 0;
      let sumTax = 0;
      for (const dl of depositLines) {
        sumHT = roundMoney(sumHT + dl.totalHT);
        sumTax = roundMoney(sumTax + dl.taxAmount);
      }

      await tx.insert(invoices).values({
        id: invoiceId,
        organizationId,
        clientId: quote.clientId,
        recipientUserId: quote.recipientUserId || null,
        type: 'invoice',
        invoiceSubtype: 'deposit',
        sourceQuoteId: quote.id,
        number: invoiceNumber,
        title: `Facture d'acompte — Devis ${quote.number}`,
        date: now.split('T')[0],
        dueDate: dueDate || quote.validUntil || null,
        status: 'sent',
        totalHT: sumHT,
        taxAmount: sumTax,
        totalTTC: depositAmount,
        prepaidAmount: 0,
        amountDue: depositAmount,
        createdByUserId: userId,
        dealId: quote.dealId || null,
        siteId: quote.siteId || null,
        createdAt: now,
        updatedAt: now,
      });

      for (let i = 0; i < depositLines.length; i++) {
        const dl = depositLines[i];
        await tx.insert(invoiceLines).values({
          id: generateId(),
          organizationId,
          invoiceId,
          description: dl.description,
          lineType: 'service',
          unitCode: 'fixed_price',
          position: i,
          quantity: dl.quantity,
          unitPrice: dl.unitPrice,
          discountRate: 0,
          taxRate: dl.taxRate,
          taxAmount: dl.taxAmount,
          totalHT: dl.totalHT,
          totalTTC: dl.totalTTC,
        });
      }

      return (await invoiceService.findById(invoiceId, organizationId))!;
    });
  },

  /**
   * Conversion d'un devis accepté en facture finale déduisant les acomptes payés.
   */
  async convertQuoteToInvoice(
    quoteId: string,
    organizationId: string,
    userId: string,
    dueDate?: string | null
  ): Promise<Invoice> {
    return await db.transaction(async (tx) => {
      const quote = await this.getQuoteById(quoteId, organizationId, tx);
      if (!quote) throw new AppError('Devis introuvable', 404);
      if (quote.status !== 'accepted') {
        throw new AppError('Seul un devis accepté peut être converti en facture finale', 400);
      }

      // Idempotence : vérifier si une facture finale existe déjà
      const existingFinal = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.sourceQuoteId, quoteId),
            eq(invoices.organizationId, organizationId),
            eq(invoices.invoiceSubtype, 'final')
          )
        )
        .limit(1);

      if (existingFinal.length > 0) {
        return (await invoiceService.findById(existingFinal[0].id, organizationId))!;
      }

      // Calcul des acomptes payés pour déduction
      const paidDepositInvoices = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.sourceQuoteId, quoteId),
            eq(invoices.organizationId, organizationId),
            eq(invoices.invoiceSubtype, 'deposit'),
            eq(invoices.status, 'paid')
          )
        );

      let prepaidAmount = 0;
      for (const dep of paidDepositInvoices) {
        prepaidAmount = roundMoney(prepaidAmount + Number(dep.totalTTC));
      }

      const totalTTC = Number(quote.totalTTC);
      const amountDue = Math.max(0, roundMoney(totalTTC - prepaidAmount));

      const invoiceNumber = await allocateBillingNumber(tx, organizationId, 'invoice');
      const invoiceId = generateId();
      const now = new Date().toISOString();

      await tx.insert(invoices).values({
        id: invoiceId,
        organizationId,
        clientId: quote.clientId,
        recipientUserId: quote.recipientUserId || null,
        type: 'invoice',
        invoiceSubtype: 'final',
        sourceQuoteId: quote.id,
        number: invoiceNumber,
        title: quote.title || `Facture — Devis ${quote.number}`,
        date: now.split('T')[0],
        dueDate: dueDate || null,
        status: amountDue === 0 ? 'paid' : 'sent',
        paidAt: amountDue === 0 ? now : null,
        totalHT: quote.totalHT,
        taxAmount: quote.taxAmount,
        totalTTC: quote.totalTTC,
        prepaidAmount,
        amountDue,
        createdByUserId: userId,
        dealId: quote.dealId || null,
        siteId: quote.siteId || null,
        createdAt: now,
        updatedAt: now,
      });

      // Cloner sections
      const sectionMap = new Map<string, string>();
      if (quote.sections && quote.sections.length > 0) {
        for (const s of quote.sections) {
          const newSecId = generateId();
          sectionMap.set(s.id, newSecId);
          await tx.insert(invoiceSections).values({
            id: newSecId,
            organizationId,
            invoiceId,
            parentSectionId: s.parentSectionId ? sectionMap.get(s.parentSectionId) || null : null,
            kind: s.kind,
            title: s.title,
            description: s.description || null,
            position: s.position,
            isOptional: s.isOptional,
            optionGroupKey: s.optionGroupKey || null,
            isSelected: s.isSelected,
          });
        }
      }

      // Cloner lignes
      if (quote.lines && quote.lines.length > 0) {
        for (const l of quote.lines) {
          await tx.insert(invoiceLines).values({
            id: generateId(),
            organizationId,
            invoiceId,
            sectionId: l.sectionId ? sectionMap.get(l.sectionId) || null : null,
            sourceLineId: l.id,
            description: l.description,
            lineType: l.lineType || 'service',
            unitCode: l.unitCode || 'unit',
            position: l.position || 0,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountRate: l.discountRate || 0,
            unitCost: l.unitCost ?? null,
            taxRate: l.taxRate,
            taxAmount: l.taxAmount || 0,
            totalHT: l.totalHT,
            totalTTC: l.totalTTC,
          });
        }
      }

      return (await invoiceService.findById(invoiceId, organizationId))!;
    });
  },

  /**
   * Création d'un Work Order d'intervention / chantier à partir d'un devis accepté (Zero Re-entry).
   */
  async createWorkOrderFromAcceptedQuote(
    organizationId: string,
    userId: string,
    input: z.input<typeof createWorkOrderFromQuoteSchema>
  ): Promise<typeof fieldServiceWorkOrders.$inferSelect> {
    const validated = createWorkOrderFromQuoteSchema.parse(input);

    return await db.transaction(async (tx) => {
      const quote = await this.getQuoteById(validated.quoteId, organizationId, tx);
      if (!quote) throw new AppError('Devis introuvable', 404);
      if (quote.status !== 'accepted') {
        throw new AppError("L'ordre de travail exige un devis accepté", 400, 'QUOTE_NOT_ACCEPTED');
      }

      // Règle d'acompte : si acompte exigé, vérifier qu'il est payé
      if ((Number(quote.depositAmount) || 0) > 0 && !validated.allowUnpaidDeposit) {
        const [paidDeposit] = await tx
          .select({ id: invoices.id })
          .from(invoices)
          .where(
            and(
              eq(invoices.sourceQuoteId, quote.id),
              eq(invoices.organizationId, organizationId),
              eq(invoices.invoiceSubtype, 'deposit'),
              eq(invoices.status, 'paid')
            )
          )
          .limit(1);

        if (!paidDeposit) {
          throw new AppError(
            "L'acompte exigé pour ce devis doit être payé avant la planification du chantier",
            400,
            'DEPOSIT_NOT_PAID'
          );
        }
      }

      // Idempotence : vérifier si un work order existe déjà pour ce devis
      const [existingWO] = await tx
        .select()
        .from(fieldServiceWorkOrders)
        .where(
          and(
            eq(fieldServiceWorkOrders.sourceQuoteId, quote.id),
            eq(fieldServiceWorkOrders.organizationId, organizationId)
          )
        )
        .limit(1);

      if (existingWO) {
        return existingWO;
      }

      const { generateWorkOrderReference } = await import('./field-service-operations.service');
      const workOrderId = generateId();
      const reference = generateWorkOrderReference();
      const initialStatus = validated.scheduledStart ? 'scheduled' : 'draft';

      const [wo] = await tx
        .insert(fieldServiceWorkOrders)
        .values({
          id: workOrderId,
          organizationId,
          clientId: quote.clientId,
          siteId: quote.siteId || null,
          sourceQuoteId: quote.id,
          createdByUserId: userId,
          reference,
          title: quote.title || `Chantier issu du devis ${quote.number}`,
          description: quote.message || `Intervention suite au devis ${quote.number}`,
          workType: validated.workType,
          status: initialStatus,
          priority: validated.priority,
          scheduledStart: validated.scheduledStart ? new Date(validated.scheduledStart) : null,
          scheduledEnd: validated.scheduledEnd ? new Date(validated.scheduledEnd) : null,
        })
        .returning();

      // Mettre à jour l'identifiant du work order sur le devis pour lien bidirectionnel
      await tx
        .update(invoices)
        .set({ workOrderId: wo.id, updatedAt: new Date().toISOString() })
        .where(eq(invoices.id, quote.id));

      return wo;
    });
  },

  /**
   * Obtient le DTO client sécurisé pour le devis (sans marges, sans prix d'achat interne).
   */
  async getClientQuote(quoteId: string, recipientUserId: string): Promise<ClientQuoteDTO | null> {
    const [quote] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, quoteId), eq(invoices.type, 'quote')))
      .limit(1);

    if (!quote) return null;

    let isRecipient = quote.recipientUserId === recipientUserId;
    if (!isRecipient) {
      const [clientRecord] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, quote.clientId), eq(clients.userId, recipientUserId)))
        .limit(1);
      if (clientRecord) isRecipient = true;
    }

    if (!isRecipient) {
      throw new AppError('Accès refusé à ce devis', 403, 'FORBIDDEN');
    }

    const sections = await db
      .select()
      .from(invoiceSections)
      .where(eq(invoiceSections.invoiceId, quoteId))
      .orderBy(asc(invoiceSections.position));

    const lines = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, quoteId))
      .orderBy(asc(invoiceLines.position));

    const fullQuote: Invoice = {
      ...quote,
      type: 'quote',
      status: quote.status,
      depositMode: quote.depositMode ?? 'none',
      invoiceSubtype: quote.invoiceSubtype ?? 'standard',
      sections: sections.map((s) => ({
        ...s,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
        updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
      })),
      lines,
    };

    const totals = calculateDocumentTotals(lines, {
      depositMode: fullQuote.depositMode,
      depositRate: fullQuote.depositRate,
      depositFixedAmount: fullQuote.depositFixedAmount,
    });

    return toClientQuoteDTO(fullQuote, totals.vatBreakdown);
  },
};
