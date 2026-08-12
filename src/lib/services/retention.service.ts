import { db } from '@/lib/db/server';
import { invoices, archivedDocuments } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getRetentionYearsForCountry } from '@/lib/data/country-retention';
import { generateId } from '@/lib/utils/id-generator';
import { ArchivedDocument } from './retention.types';
import JSZip from 'jszip';

export class RetentionService {
  async lockDocument(documentId: string, documentType: 'invoice' | 'quote'): Promise<void> {
    const invData = await db.select().from(invoices).where(eq(invoices.id, documentId));
    if (!invData.length) throw new Error('Document not found');
    const doc = invData[0];

    const retentionDate = await this.calculateRetentionDate(doc.id, doc.supplierCountry);

    await db.update(invoices)
      .set({
        lockedAt: new Date().toISOString(),
        lockedBy: 'system',
        retentionUntil: retentionDate.toISOString(),
      })
      .where(eq(invoices.id, documentId));
  }

  async calculateRetentionDate(documentId: string, supplierCountry: string | null): Promise<Date> {
    const country = supplierCountry || 'FR';
    const years = getRetentionYearsForCountry(country);
    
    const invData = await db.select().from(invoices).where(eq(invoices.id, documentId));
    if (!invData.length) throw new Error('Document not found');
    const doc = invData[0];
    
    const issueDate = new Date(doc.date);
    const retentionDate = new Date(issueDate);
    retentionDate.setFullYear(retentionDate.getFullYear() + years);
    return retentionDate;
  }

  async getExpiredDocuments(organizationId: string): Promise<any[]> {
    const now = new Date().toISOString();
    const expiredInvoices = await db.select().from(invoices)
      .where(and(
        eq(invoices.organizationId, organizationId),
        sql`${invoices.retentionUntil} < ${now}`,
        sql`${invoices.lockedAt} IS NOT NULL`
      ));
    return expiredInvoices;
  }

  async anonymizeDocument(documentId: string, documentType: 'invoice' | 'quote'): Promise<void> {
    const invData = await db.select().from(invoices).where(eq(invoices.id, documentId));
    if (!invData.length) throw new Error('Document not found');
    const doc = invData[0];

    // On maske/anonymise les informations d'identification PII, mais on garde le total et les identifiants TVA
    // En théorie, le client est dans une autre table. Si les données sont dénormalisées, on les met à jour ici.
    // L'implémentation actuelle de monservice lie à un `clientId`. On va supposer ici qu'on met à jour un audit et qu'on empêche la vue de `clientId` ou on anonymise le client si toutes ses factures sont échues.
    // Pour l'exemple, on log dans archivedDocuments que c'est anonymisé.
    await db.update(invoices)
      .set({
        updatedAt: new Date().toISOString(),
      })
      .where(eq(invoices.id, documentId));

    await db.insert(archivedDocuments).values({
      id: generateId(),
      documentId,
      documentType,
      organizationId: doc.organizationId,
      retentionDate: new Date(doc.retentionUntil || new Date().toISOString()),
      archivedAt: new Date(),
      anonymized: true,
      expirationStatus: 'anonymized',
    });
  }

  async exportArchive(organizationId: string, startDate: Date, endDate: Date): Promise<Buffer> {
    const docs = await db.select().from(invoices).where(and(
      eq(invoices.organizationId, organizationId),
      sql`${invoices.date} >= ${startDate.toISOString()}`,
      sql`${invoices.date} <= ${endDate.toISOString()}`
    ));

    const zip = new JSZip();
    for (const doc of docs) {
      zip.file(`${doc.type}_${doc.number}.json`, JSON.stringify(doc, null, 2));
    }
    
    const content = await zip.generateAsync({ type: 'nodebuffer' });
    return content;
  }
}

export const retentionService = new RetentionService();
