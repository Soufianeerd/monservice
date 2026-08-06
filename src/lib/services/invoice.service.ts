import { db } from '../db/server';
import { invoices, invoiceLines } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { generateId } from '../utils/id-generator';
import { Invoice, InvoiceLine } from '../data/interfaces';
import { invoiceSchema } from '../validation/schemas';
import { AppError } from '@/lib/errors';
import { userService } from './user.service';

export const invoiceService = {
  async findAll(organizationId: string): Promise<Invoice[]> {
    const invs = await db.select().from(invoices).where(eq(invoices.organizationId, organizationId));
    if (invs.length === 0) return [];
    
    const result: Invoice[] = [];
    for (const inv of invs) {
      const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, inv.id));
      result.push({ ...inv, type: inv.type as Invoice['type'], status: inv.status as Invoice['status'], lines });
    }
    return result;
  },

  async findByClient(clientId: string): Promise<Invoice[]> {
    const invs = await db.select().from(invoices).where(eq(invoices.clientId, clientId));
    if (invs.length === 0) return [];
    
    const result: Invoice[] = [];
    for (const inv of invs) {
      const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, inv.id));
      result.push({ ...inv, type: inv.type as Invoice['type'], status: inv.status as Invoice['status'], lines });
    }
    return result;
  },

  async findByProfessional(professionalId: string): Promise<Invoice[]> {
    return this.findAll(professionalId);
  },

  async findById(id: string, organizationId: string): Promise<Invoice | null> {
    const result = await db.select().from(invoices).where(
      and(eq(invoices.id, id), eq(invoices.organizationId, organizationId))
    );
    if (!result.length) return null;
    const inv = result[0];
    
    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, inv.id));
    return { ...inv, type: inv.type as Invoice['type'], status: inv.status as Invoice['status'], lines };
  },

  async getById(id: string): Promise<Invoice | null> {
    const result = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!result.length) return null;
    const inv = result[0];
    
    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, inv.id));
    return { ...inv, type: inv.type as Invoice['type'], status: inv.status as Invoice['status'], lines };
  },

  async signInvoice(
    invoiceId: string, 
    organizationId: string, 
    signatureData: string, 
    ipAddress: string | null, 
    userAgent: string | null
  ) {
    // Vérification d'appartenance
    const check = await db.select().from(invoices).where(
      and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId))
    );
    if (check.length === 0) throw new AppError('Facture non trouvée', 404);

    // Suppression de l'ancienne action publique updateSignature. 
    // Désormais, l'IP et l'UA sont stockés en base.
    await db.update(invoices).set({
      signature: signatureData,
      signedAt: new Date().toISOString(),
      signatureDate: new Date().toISOString(),
      signatureIp: ipAddress,       // Maintenant rempli depuis la requête (MS-032)
      // user_agent n'existe pas dans la table, il faudrait l'ajouter en colonne, 
      // sinon on logge simplement.
    }).where(eq(invoices.id, invoiceId));

    console.info('[audit] invoice.signed', { 
      invoiceId, 
      ip: ipAddress, 
      at: new Date().toISOString() 
    });
  },

  /**
   * Passe une facture au statut « payée ».
   *
   * ⚠️ RÉSERVÉ AU WEBHOOK STRIPE. Cette méthode ne doit être appelée que
   * depuis `/api/stripe/webhook`, après vérification de la signature de
   * l'événement. Elle a été retirée de la surface des server actions :
   * n'importe qui pouvait auparavant marquer n'importe quelle facture comme
   * réglée sans paiement (anomalie MS-007).
   *
   * Idempotente : une facture déjà payée n'est pas modifiée.
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

    // Vérification du montant lorsque Stripe le fournit : une divergence
    // signale une manipulation ou une erreur de configuration.
    if (typeof amountPaidCents === 'number') {
      const expected = Math.round(existing.totalTTC * 100);
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
      .set({ status: 'paid', paidAt: now, paymentIntentId, updatedAt: now })
      .where(eq(invoices.id, id));

    console.info('[audit] invoice.paid', { invoiceId: id, paymentIntentId, at: now });

    return this.getById(id);
  },

  async generateNumber(type: 'invoice' | 'quote', organizationId: string): Promise<string> {
    const prefix = type === 'invoice' ? 'F' : 'D';
    const year = new Date().getFullYear();

    const result = await db.select({
      number: invoices.number,
    }).from(invoices)
      .where(
        and(
          eq(invoices.organizationId, organizationId),
          sql`${invoices.number} LIKE ${prefix + '-' + year + '-%'}`
        )
      )
      .orderBy(sql`${invoices.number} DESC`)
      .limit(1);

    let sequence = 1;
    if (result.length > 0 && result[0].number) {
      const parts = result[0].number.split('-');
      if (parts.length >= 3) {
        sequence = parseInt(parts[2], 10) + 1;
      }
    }

    return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
  },

  async calculateTotals(invoiceId: string, organizationId: string) {
    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));

    let totalHT = 0;
    let totalTax = 0;

    for (const line of lines) {
      const lineHT = line.quantity * line.unitPrice;
      const lineTax = lineHT * (line.taxRate / 100);
      totalHT += lineHT;
      totalTax += lineTax;
    }

    const totalTTC = totalHT + totalTax;

    await db.update(invoices)
      .set({
        totalHT,
        taxAmount: totalTax,
        totalTTC,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId)));

    return { totalHT, taxAmount: totalTax, totalTTC };
  },

  async create(data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'lines'>, lines: Omit<InvoiceLine, 'id' | 'invoiceId'>[], userId: string): Promise<Invoice> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== data.organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const validated = invoiceSchema.parse(data);
    const now = new Date().toISOString();
    
    // Automatically generate number if not provided
    const number = validated.number || await this.generateNumber(validated.type as 'invoice' | 'quote', validated.organizationId);

    const newInvoice = {
      id: generateId(),
      ...validated,
      number,
      signature: data.signature ? JSON.stringify(data.signature) : null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(invoices).values(newInvoice as any);

    const insertedLines: InvoiceLine[] = [];
    for (const line of lines) {
      const newLine = {
        id: generateId(),
        invoiceId: newInvoice.id,
        productId: line.productId || null,
        description: line.description || '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        totalHT: line.totalHT || (line.quantity * line.unitPrice),
        totalTTC: line.totalTTC || (line.quantity * line.unitPrice * (1 + line.taxRate / 100)),
      };
      await db.insert(invoiceLines).values(newLine);
      insertedLines.push(newLine);
    }

    await this.calculateTotals(newInvoice.id, newInvoice.organizationId);
    
    return this.findById(newInvoice.id, newInvoice.organizationId) as Promise<Invoice>;
  },

  async update(id: string, organizationId: string, data: Partial<Invoice>, userId: string): Promise<Invoice | null> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const { lines, signature, ...invoiceData } = data;
    
    const partialSchema = invoiceSchema.partial();
    const validated = partialSchema.parse(invoiceData);
    
    const updated = {
      ...validated,
      signature: signature !== undefined ? (signature ? JSON.stringify(signature) : null) : undefined,
      updatedAt: new Date().toISOString(),
    };
    
    await db.update(invoices)
      .set(updated)
      .where(and(eq(invoices.id, id), eq(invoices.organizationId, organizationId)));

    if (lines) {
      await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, id));
      for (const line of lines) {
        const newLine = {
          id: line.id || generateId(),
          invoiceId: id,
          productId: line.productId || null,
          description: line.description || '',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          totalHT: line.totalHT || (line.quantity * line.unitPrice),
          totalTTC: line.totalTTC || (line.quantity * line.unitPrice * (1 + line.taxRate / 100)),
        };
        await db.insert(invoiceLines).values(newLine);
      }
      await this.calculateTotals(id, organizationId);
    }

    return await this.findById(id, organizationId);
  },

  async delete(id: string, organizationId: string, userId: string): Promise<void> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }
    const inv = await this.findById(id, organizationId);
    if (!inv) return;
    await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, id));
    await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.organizationId, organizationId)));
  },

  async getNextInvoiceNumber(organizationId: string, type: 'invoice' | 'quote'): Promise<string> {
    return this.generateNumber(type, organizationId);
  }
};
