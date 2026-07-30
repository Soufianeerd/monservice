import { db } from '@/lib/db';
import { invoices, invoiceLines } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils/id-generator';
import { Invoice, InvoiceLine } from '@/lib/data/interfaces';

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
    // Dans le cas de monservice, l'organizationId EST l'id du professionnel
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

  async updateSignature(id: string, signatureData: Record<string, unknown>): Promise<Invoice | null> {
    await db.update(invoices).set({
      signature: JSON.stringify(signatureData),
      signedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'accepted' // usually a quote gets accepted when signed
    }).where(eq(invoices.id, id));
    
    return this.getById(id);
  },

  async markAsPaid(id: string, paymentIntentId: string): Promise<Invoice | null> {
    await db.update(invoices).set({
      status: 'paid',
      paidAt: new Date().toISOString(),
      paymentIntentId,
      updatedAt: new Date().toISOString(),
    }).where(eq(invoices.id, id));
    
    return this.getById(id);
  },

  async create(data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'lines'>, lines: Omit<InvoiceLine, 'id' | 'invoiceId'>[]): Promise<Invoice> {
    const now = new Date().toISOString();
    const newInvoice = {
      id: generateId(),
      ...data,
      signature: data.signature ? JSON.stringify(data.signature) : null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(invoices).values(newInvoice);

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
    
    return { ...newInvoice, type: newInvoice.type as Invoice['type'], status: newInvoice.status as Invoice['status'], signature: data.signature, lines: insertedLines };
  },

  async update(id: string, organizationId: string, data: Partial<Invoice>): Promise<Invoice | null> {
    const { lines, signature, ...invoiceData } = data;
    
    const updated = {
      ...invoiceData,
      signature: signature !== undefined ? (signature ? JSON.stringify(signature) : null) : undefined,
      updatedAt: new Date().toISOString(),
    };
    
    await db.update(invoices)
      .set(updated)
      .where(and(eq(invoices.id, id), eq(invoices.organizationId, organizationId)));

    if (lines) {
      // Simplest way is to delete old lines and insert new ones
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
    }

    return await this.findById(id, organizationId);
  },

  async delete(id: string, organizationId: string): Promise<void> {
    const inv = await this.findById(id, organizationId);
    if (!inv) return;
    await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, id));
    await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.organizationId, organizationId)));
  },

  async getNextInvoiceNumber(organizationId: string, type: 'invoice' | 'quote'): Promise<string> {
    const invs = await db.select().from(invoices).where(
      and(eq(invoices.organizationId, organizationId), eq(invoices.type, type))
    );
    const prefix = type === 'invoice' ? 'FAC' : 'DEV';
    const year = new Date().getFullYear().toString();
    const count = invs.length + 1;
    return `${prefix}-${year}-${count.toString().padStart(4, '0')}`;
  }
};
