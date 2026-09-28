import { db } from '../db/server';
import { invoices, invoiceLines, invoiceSections, clients } from '../db/schema';
import { eq, and, sql, desc, or, inArray, asc } from 'drizzle-orm';
import { generateId } from '../utils/id-generator';
import { Invoice, InvoiceLine, InvoiceSection, InvoiceStatus } from '../data/interfaces';
import { invoiceSchema } from '../validation/schemas';
import { AppError } from '@/lib/errors';
import { userService } from './user.service';
import { TaxService } from './tax.service';
import { InvoiceTaxData } from './tax.types';
import { calculateDocumentTotals, calculateLine } from './billing-calculator';
import { allocateBillingNumber } from './quote.service';

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function mapDbInvoice(inv: typeof invoices.$inferSelect, lines: InvoiceLine[], sections: InvoiceSection[] = []): Invoice {
  return {
    ...inv,
    type: inv.type === 'quote' ? 'quote' : 'invoice',
    status: inv.status,
    invoiceSubtype: inv.invoiceSubtype ?? 'standard',
    depositMode: inv.depositMode ?? 'none',
    lines,
    sections: sections.length > 0 ? sections : undefined,
  };
}

export const invoiceService = {
  async findAll(organizationId: string): Promise<Invoice[]> {
    const invs = await db.select().from(invoices).where(eq(invoices.organizationId, organizationId));
    if (invs.length === 0) return [];
    
    const result: Invoice[] = [];
    for (const inv of invs) {
      const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, inv.id)).orderBy(asc(invoiceLines.position));
      const sections = await db.select().from(invoiceSections).where(eq(invoiceSections.invoiceId, inv.id)).orderBy(asc(invoiceSections.position));
      result.push(mapDbInvoice(inv, lines, sections.map(s => ({
        ...s,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
        updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
      }))));
    }
    return result;
  },

  async findByClient(userId: string): Promise<Invoice[]> {
    const userClients = await db.select({ id: clients.id }).from(clients).where(eq(clients.userId, userId));
    const clientIds = userClients.map(c => c.id);

    const condition = clientIds.length > 0
      ? or(eq(invoices.recipientUserId, userId), inArray(invoices.clientId, clientIds))
      : eq(invoices.recipientUserId, userId);

    const invs = await db.select().from(invoices).where(condition);
    if (invs.length === 0) return [];
    
    const result: Invoice[] = [];
    for (const inv of invs) {
      const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, inv.id)).orderBy(asc(invoiceLines.position));
      const sections = await db.select().from(invoiceSections).where(eq(invoiceSections.invoiceId, inv.id)).orderBy(asc(invoiceSections.position));
      result.push(mapDbInvoice(inv, lines, sections.map(s => ({
        ...s,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
        updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
      }))));
    }
    return result;
  },

  async findByProfessional(organizationId: string): Promise<Invoice[]> {
    return this.findAll(organizationId);
  },

  async findById(id: string, organizationId: string, customDb: DbTx | typeof db = db): Promise<Invoice | null> {
    const result = await customDb.select().from(invoices).where(
      and(eq(invoices.id, id), eq(invoices.organizationId, organizationId))
    );
    if (!result.length) return null;
    const inv = result[0];
    
    const lines = await customDb.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, inv.id)).orderBy(asc(invoiceLines.position));
    const sections = await customDb.select().from(invoiceSections).where(eq(invoiceSections.invoiceId, inv.id)).orderBy(asc(invoiceSections.position));
    return mapDbInvoice(inv, lines, sections.map(s => ({
      ...s,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
      updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
    })));
  },

  async getById(id: string, customDb: DbTx | typeof db = db): Promise<Invoice | null> {
    const result = await customDb.select().from(invoices).where(eq(invoices.id, id));
    if (!result.length) return null;
    const inv = result[0];
    
    const lines = await customDb.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, inv.id)).orderBy(asc(invoiceLines.position));
    const sections = await customDb.select().from(invoiceSections).where(eq(invoiceSections.invoiceId, inv.id)).orderBy(asc(invoiceSections.position));
    return mapDbInvoice(inv, lines, sections.map(s => ({
      ...s,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
      updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
    })));
  },

  async updateStatusAsClient(id: string, clientUserId: string, status: InvoiceStatus): Promise<void> {
    const inv = await this.getById(id);
    if (!inv) throw new AppError('Accès refusé à ce document', 403, 'FORBIDDEN');

    let isAuthorized = inv.recipientUserId === clientUserId;
    if (!isAuthorized) {
      const [crmClient] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, inv.clientId), eq(clients.userId, clientUserId)))
        .limit(1);
      if (crmClient) isAuthorized = true;
    }

    if (!isAuthorized) {
      throw new AppError('Accès refusé à ce document', 403, 'FORBIDDEN');
    }

    // Clients can only mark quotes as viewed or cancelled/rejected, not arbitrary status
    if (inv.type === 'quote') {
      if (status === 'viewed') {
        const { quoteService } = await import('./quote.service');
        await quoteService.markQuoteViewed(id, clientUserId);
        return;
      }
      if (status === 'cancelled' || status === 'rejected') {
        const { quoteService } = await import('./quote.service');
        await quoteService.rejectQuote(id, 'Refusé par le client', clientUserId);
        return;
      }
    }

    await db.update(invoices).set({ status, updatedAt: new Date().toISOString() }).where(eq(invoices.id, id));
  },

  async signInvoice(
    invoiceId: string, 
    organizationId: string, 
    signatureData: string, 
    ipAddress: string | null, 
    userAgent: string | null
  ) {
    const check = await db.select().from(invoices).where(
      and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId))
    );
    if (check.length === 0) throw new AppError('Facture non trouvée', 404);

    const now = new Date().toISOString();
    await db.update(invoices).set({
      signature: signatureData,
      signedAt: now,
      signatureDate: now,
      signatureIp: ipAddress,
      updatedAt: now,
    }).where(eq(invoices.id, invoiceId));

    console.info('[audit] invoice.signed', { 
      invoiceId, 
      ip: ipAddress, 
      at: now 
    });
  },

  /**
   * Passe une facture au statut « payée ».
   * RÉSERVÉ AU WEBHOOK STRIPE.
   */
  async markAsPaidFromStripeWebhook(
    id: string,
    paymentIntentId: string,
    amountPaidCents?: number,
  ): Promise<Invoice | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    if (existing.status === 'paid') {
      console.info('[audit] invoice.payment.duplicate_ignored', { invoiceId: id, paymentIntentId });
      return existing;
    }

    if (typeof amountPaidCents === 'number') {
      const payableAmount = existing.amountDue ?? existing.totalTTC;
      const expected = Math.round(payableAmount * 100);
      if (amountPaidCents !== expected) {
        console.error('[audit] invoice.payment.amount_mismatch', {
          invoiceId: id,
          expected,
          received: amountPaidCents,
        });
        throw new AppError('Montant payé incohérent avec la facture', 409, 'AMOUNT_MISMATCH');
      }
    }

    const now = new Date().toISOString();
    await db
      .update(invoices)
      .set({
        status: 'paid',
        paidAt: now,
        paymentIntentId,
        amountDue: 0,
        updatedAt: now,
      })
      .where(eq(invoices.id, id));

    console.info('[audit] invoice.paid', { invoiceId: id, paymentIntentId, at: now });

    return this.getById(id);
  },

  async generateNumber(type: 'invoice' | 'quote', organizationId: string): Promise<string> {
    return await db.transaction(async (tx) => allocateBillingNumber(tx, organizationId, type));
  },

  async calculateTotals(invoiceId: string, organizationId: string) {
    // Tenant check first
    const [inv] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId)))
      .limit(1);

    if (!inv) throw new AppError('Document introuvable dans cette organisation', 404);

    const lines = await db
      .select()
      .from(invoiceLines)
      .where(and(eq(invoiceLines.invoiceId, invoiceId), eq(invoiceLines.organizationId, organizationId)))
      .orderBy(asc(invoiceLines.position));

    const totals = calculateDocumentTotals(lines, {
      depositMode: inv.depositMode ?? 'none',
      depositRate: inv.depositRate,
      depositFixedAmount: inv.depositFixedAmount,
      prepaidAmount: inv.prepaidAmount,
    });

    for (const l of totals.lines) {
      if (l.id) {
        await db
          .update(invoiceLines)
          .set({
            totalHT: l.totalHT,
            taxAmount: l.taxAmount,
            totalTTC: l.totalTTC,
            discountRate: l.discountRate,
          })
          .where(and(eq(invoiceLines.id, l.id), eq(invoiceLines.organizationId, organizationId)));
      }
    }

    await db
      .update(invoices)
      .set({
        totalHT: totals.totalHT,
        taxAmount: totals.taxAmount,
        totalTTC: totals.totalTTC,
        depositAmount: totals.depositAmount,
        amountDue: totals.amountDue,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId)));

    return {
      totalHT: totals.totalHT,
      taxAmount: totals.taxAmount,
      totalTTC: totals.totalTTC,
      depositAmount: totals.depositAmount,
      amountDue: totals.amountDue,
    };
  },

  async create(
    data: Partial<Invoice> & { organizationId: string; clientId: string },
    lines: (Omit<InvoiceLine, 'id' | 'invoiceId' | 'organizationId' | 'totalHT' | 'totalTTC'> & Partial<InvoiceLine>)[],
    userId: string
  ): Promise<Invoice> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== data.organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    return await db.transaction(async (tx) => {
      // Validate client belongs to organization
      const [client] = await tx
        .select({ id: clients.id, userId: clients.userId })
        .from(clients)
        .where(and(eq(clients.id, data.clientId), eq(clients.organizationId, data.organizationId)))
        .limit(1);

      if (!client) {
        throw new AppError('Client introuvable dans cette organisation', 404, 'CLIENT_NOT_FOUND');
      }

      const validated = invoiceSchema.parse(data);
      const now = new Date().toISOString();
      
      const taxData: InvoiceTaxData = {
        supplierCountry: validated.supplierCountry || 'FR',
        supplierVatId: validated.supplierVatId || undefined,
        supplierLegalEntityId: validated.legalEntityId || undefined,
        customerCountry: validated.customerCountry || 'FR',
        customerVatId: validated.customerVatId || undefined,
        customerType: validated.customerType || 'B2B',
        productType: validated.productType || undefined,
        productCategory: validated.productCategory || undefined,
        transactionDate: new Date(),
      };

      const taxService = new TaxService();
      const vatResult = await taxService.determineVatTreatment(taxData);

      const docType = (validated.type as 'invoice' | 'quote') || 'invoice';
      const number = validated.number || await allocateBillingNumber(tx, validated.organizationId, docType);
      const invoiceId = generateId();

      const totals = calculateDocumentTotals(lines);

      await tx.insert(invoices).values({
        id: invoiceId,
        organizationId: validated.organizationId,
        clientId: validated.clientId,
        recipientUserId: client.userId || null,
        type: docType,
        number,
        date: validated.date,
        dueDate: validated.dueDate || null,
        message: validated.message || null,
        status: (validated.status || 'draft') as InvoiceStatus,
        totalHT: totals.totalHT,
        taxAmount: totals.taxAmount,
        totalTTC: totals.totalTTC,
        amountDue: totals.totalTTC,
        prepaidAmount: 0,
        depositAmount: 0,
        signature: data.signature ? JSON.stringify(data.signature) : null,
        vatTreatment: vatResult.treatment,
        vatRate: vatResult.rate,
        vatExemptionCode: vatResult.vatCode,
        reverseCharge: vatResult.treatment === 'reverse_charge',
        legalRuleVersion: vatResult.legalRuleVersion,
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      });

      for (let i = 0; i < totals.lines.length; i++) {
        const l = totals.lines[i];
        await tx.insert(invoiceLines).values({
          id: generateId(),
          organizationId: validated.organizationId,
          invoiceId,
          productId: l.productId || null,
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

      const created = await this.findById(invoiceId, validated.organizationId);
      if (!created) throw new AppError('Erreur de création de document', 500);
      return created;
    });
  },

  async update(id: string, organizationId: string, data: Partial<Invoice>, userId: string): Promise<Invoice> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const existing = await this.findById(id, organizationId);
    if (!existing) {
      throw new AppError('Document not found', 404);
    }
    if (existing.lockedAt) {
      throw new AppError('Cannot modify a locked document', 403);
    }

    return await db.transaction(async (tx) => {
      const { lines, signature, ...invoiceData } = data;
      
      const partialSchema = invoiceSchema.partial();
      const validated = partialSchema.parse(invoiceData);
      
      const updated = {
        ...validated,
        status: validated.status ? (validated.status as InvoiceStatus) : undefined,
        signature: signature !== undefined ? (signature ? JSON.stringify(signature) : null) : undefined,
        updatedAt: new Date().toISOString(),
      };
      
      await tx.update(invoices)
        .set(updated)
        .where(and(eq(invoices.id, id), eq(invoices.organizationId, organizationId)));

      if (lines) {
        await tx.delete(invoiceLines).where(and(eq(invoiceLines.invoiceId, id), eq(invoiceLines.organizationId, organizationId)));
        const calculatedLines = lines.map(calculateLine);
        for (let i = 0; i < calculatedLines.length; i++) {
          const line = calculatedLines[i];
          await tx.insert(invoiceLines).values({
            id: line.id || generateId(),
            organizationId,
            invoiceId: id,
            productId: line.productId || null,
            description: line.description || '',
            lineType: line.lineType || 'service',
            unitCode: line.unitCode || 'unit',
            position: i,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountRate: line.discountRate,
            unitCost: line.unitCost ?? null,
            taxRate: line.taxRate,
            taxAmount: line.taxAmount,
            totalHT: line.totalHT,
            totalTTC: line.totalTTC,
          });
        }
      }

      await this.calculateTotals(id, organizationId);

      if (validated.status === 'sent' || validated.status === 'paid') {
        const { retentionService } = await import('./retention.service');
        await retentionService.lockDocument(id, existing.type);
      }

      const updatedDoc = await this.findById(id, organizationId);
      if (!updatedDoc) throw new AppError('Erreur de mise à jour du document', 500);
      return updatedDoc;
    });
  },

  async delete(id: string, organizationId: string, userId: string): Promise<void> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }
    const inv = await this.findById(id, organizationId);
    if (!inv) return;
    if (inv.lockedAt) {
      throw new AppError('Cannot delete a locked document', 403);
    }
    if (inv.status !== 'draft') {
      throw new AppError('Cannot delete a non-draft document', 403, 'CANNOT_DELETE_NON_DRAFT');
    }

    await db.transaction(async (tx) => {
      await tx.delete(invoiceLines).where(and(eq(invoiceLines.invoiceId, id), eq(invoiceLines.organizationId, organizationId)));
      await tx.delete(invoiceSections).where(and(eq(invoiceSections.invoiceId, id), eq(invoiceSections.organizationId, organizationId)));
      await tx.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.organizationId, organizationId)));
    });
  },

  async getNextInvoiceNumber(organizationId: string, type: 'invoice' | 'quote'): Promise<string> {
    return this.generateNumber(type, organizationId);
  },

  async updateSignature(
    invoiceId: string,
    organizationId: string,
    data: { signature: string; signatureIp?: string | null; signedByUserId?: string; userAgent?: string | null }
  ) {
    const existing = await this.findById(invoiceId, organizationId);
    if (!existing) throw new AppError('Document non trouvé', 404);

    const now = new Date().toISOString();
    await db.update(invoices)
      .set({
        signature: data.signature,
        signatureIp: data.signatureIp,
        signedAt: now,
        updatedAt: now,
      })
      .where(eq(invoices.id, invoiceId));

    console.info('[audit] invoice.signed', {
      invoiceId,
      signedBy: data.signedByUserId,
      ip: data.signatureIp,
      at: now,
    });

    return await this.findById(invoiceId, organizationId);
  }
};
