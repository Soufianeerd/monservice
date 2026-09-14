import { db } from '@/lib/db/server';
import {
  patientBillingLinks,
  patientProfiles,
  patientRepresentatives,
  patientRepresentativeLinks,
  patientPortalAccess,
  clients,
  invoices,
  invoiceLines,
  practicePractitioners,
} from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { randomUUID } from 'crypto';
import { invoiceService } from './invoice.service';
import type {
  CreatePatientInvoiceInput,
  PatientInvoiceDTO,
} from '@/lib/patient-billing/types';
import type { InvoiceLine } from '@/lib/data/interfaces';

export class PatientBillingService {
  /**
   * Assure l'existence d'une fiche client administrative (CRM) liée au dossier patient.
   * Ne copie AUCUNE donnée clinique (antécédents, diagnostics, notes).
   */
  async ensurePatientBillingClient(
    organizationId: string,
    patientId: string,
  ): Promise<{ clientId: string; isNew: boolean }> {
    // 1. Check if link already exists
    const [existingLink] = await db
      .select()
      .from(patientBillingLinks)
      .where(
        and(
          eq(patientBillingLinks.organizationId, organizationId),
          eq(patientBillingLinks.patientId, patientId),
        ),
      );

    if (existingLink) {
      return { clientId: existingLink.clientId, isNew: false };
    }

    // 2. Fetch patient details
    const [patient] = await db
      .select()
      .from(patientProfiles)
      .where(
        and(
          eq(patientProfiles.id, patientId),
          eq(patientProfiles.organizationId, organizationId),
          eq(patientProfiles.isActive, true),
        ),
      );

    if (!patient) {
      throw new AppError('Dossier patient introuvable ou inactif', 404, 'PATIENT_NOT_FOUND');
    }

    // 3. Check for billing representative if any
    const repLinks = await db
      .select({
        link: patientRepresentativeLinks,
        rep: patientRepresentatives,
      })
      .from(patientRepresentativeLinks)
      .innerJoin(
        patientRepresentatives,
        and(
          eq(patientRepresentatives.id, patientRepresentativeLinks.representativeId),
          eq(patientRepresentatives.organizationId, organizationId),
        ),
      )
      .where(
        and(
          eq(patientRepresentativeLinks.organizationId, organizationId),
          eq(patientRepresentativeLinks.patientId, patientId),
          eq(patientRepresentativeLinks.isBillingContact, true),
          eq(patientRepresentativeLinks.isActive, true),
          eq(patientRepresentatives.isActive, true),
        ),
      );

    const billingRep = repLinks[0]?.rep;

    // Check if patient has linked portal auth user
    const [portalAccess] = await db
      .select()
      .from(patientPortalAccess)
      .where(
        and(
          eq(patientPortalAccess.organizationId, organizationId),
          eq(patientPortalAccess.patientId, patientId),
          eq(patientPortalAccess.isActive, true),
        ),
      );

    const now = new Date().toISOString();
    const newClientId = randomUUID();

    const patientFullName = `${patient.usedFirstName || patient.firstBirthName} ${patient.usedName || patient.birthName}`.trim();
    const clientName = billingRep
      ? `${billingRep.firstName} ${billingRep.lastName}`.trim()
      : patientFullName;

    const clientEmail = billingRep ? billingRep.email : patient.email;
    const clientPhone = billingRep ? billingRep.phone : patient.phone;
    const clientAddress = billingRep ? billingRep.address : patient.address;
    const clientCity = billingRep ? billingRep.city : patient.city;
    const clientZip = billingRep ? billingRep.postalCode : patient.postalCode;
    const userId = portalAccess?.userId || null;

    // Create client record in CRM
    await db.insert(clients).values({
      id: newClientId,
      organizationId,
      userId,
      name: clientName || 'Patient',
      email: clientEmail || null,
      phone: clientPhone || null,
      address: clientAddress || null,
      city: clientCity || null,
      zipCode: clientZip || null,
      country: 'France',
      createdAt: now,
      updatedAt: now,
    });

    // Create billing link
    await db.insert(patientBillingLinks).values({
      id: randomUUID(),
      organizationId,
      patientId,
      clientId: newClientId,
    });

    return { clientId: newClientId, isNew: true };
  }

  /**
   * Crée une facture paramédicale pour un patient.
   */
  async createPatientInvoice(
    organizationId: string,
    practitionerId: string,
    createdByUserId: string,
    input: CreatePatientInvoiceInput,
  ): Promise<PatientInvoiceDTO> {
    // 1. Verify practitioner
    const [practitioner] = await db
      .select()
      .from(practicePractitioners)
      .where(
        and(
          eq(practicePractitioners.id, practitionerId),
          eq(practicePractitioners.organizationId, organizationId),
          eq(practicePractitioners.isActive, true),
        ),
      );

    if (!practitioner) {
      throw new AppError('Praticien introuvable ou inactif', 404, 'PRACTITIONER_NOT_FOUND');
    }

    // 2. Ensure billing client
    const { clientId } = await this.ensurePatientBillingClient(organizationId, input.patientId);

    // 3. Find recipient user ID if portal access exists
    const [portalAccess] = await db
      .select()
      .from(patientPortalAccess)
      .where(
        and(
          eq(patientPortalAccess.organizationId, organizationId),
          eq(patientPortalAccess.patientId, input.patientId),
          eq(patientPortalAccess.isActive, true),
        ),
      );

    const recipientUserId = portalAccess?.userId || null;

    // 4. Generate invoice number
    const invoiceNumber = await invoiceService.generateNumber('invoice', organizationId);

    // 5. Calculate totals
    let totalHT = 0;
    let totalTax = 0;

    for (const line of input.lines) {
      const lineHT = line.quantity * line.unitPrice;
      const lineTax = lineHT * (line.vatRate / 100);
      totalHT += lineHT;
      totalTax += lineTax;
    }

    const totalTTC = totalHT + totalTax;
    const now = new Date().toISOString();
    const invoiceId = randomUUID();

    // 6. Insert invoice
    await db.insert(invoices).values({
      id: invoiceId,
      organizationId,
      clientId,
      recipientUserId,
      professionalId: createdByUserId,
      type: 'invoice',
      number: invoiceNumber,
      date: now.split('T')[0],
      dueDate: input.dueDate,
      status: 'sent',
      totalHT,
      taxAmount: totalTax,
      totalTTC,
      message: input.notes || null,
      customerCountry: 'FR',
      customerType: 'B2C',
      vatTreatment: totalTax === 0 ? 'exempt' : 'standard',
      vatRate: input.lines[0]?.vatRate ?? 0,
      createdAt: now,
      updatedAt: now,
    });

    // 7. Insert invoice lines
    const insertedLines: InvoiceLine[] = [];
    for (const line of input.lines) {
      const lineId = randomUUID();
      const lineHT = line.quantity * line.unitPrice;
      const lineTax = lineHT * (line.vatRate / 100);
      const lineTTC = lineHT + lineTax;

      await db.insert(invoiceLines).values({
        id: lineId,
        invoiceId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.vatRate,
        totalHT: lineHT,
        totalTTC: lineTTC,
      });

      insertedLines.push({
        id: lineId,
        invoiceId,
        productId: undefined,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.vatRate,
        totalHT: lineHT,
        totalTTC: lineTTC,
      });
    }

    return {
      id: invoiceId,
      organizationId,
      invoiceNumber,
      issueDate: now.split('T')[0],
      dueDate: input.dueDate,
      status: 'sent',
      totalHT,
      totalTTC,
      currency: 'EUR',
      recipientUserId,
      patientId: input.patientId,
      lines: insertedLines,
    };
  }

  /**
   * Liste les factures d'un patient pour les praticiens du cabinet.
   */
  async listPatientInvoices(
    organizationId: string,
    patientId: string,
  ): Promise<PatientInvoiceDTO[]> {
    const [billingLink] = await db
      .select()
      .from(patientBillingLinks)
      .where(
        and(
          eq(patientBillingLinks.organizationId, organizationId),
          eq(patientBillingLinks.patientId, patientId),
        ),
      );

    if (!billingLink) {
      return [];
    }

    const patientInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, organizationId),
          eq(invoices.clientId, billingLink.clientId),
          eq(invoices.type, 'invoice'),
        ),
      )
      .orderBy(desc(invoices.createdAt));

    const result: PatientInvoiceDTO[] = [];

    for (const inv of patientInvoices) {
      const lines = await db
        .select()
        .from(invoiceLines)
        .where(eq(invoiceLines.invoiceId, inv.id));

      result.push({
        id: inv.id,
        organizationId: inv.organizationId,
        invoiceNumber: inv.number,
        issueDate: inv.date,
        dueDate: inv.dueDate || inv.date,
        status: inv.status as PatientInvoiceDTO['status'],
        totalHT: inv.totalHT,
        totalTTC: inv.totalTTC,
        currency: 'EUR',
        recipientUserId: inv.recipientUserId,
        patientId,
        lines: lines.map((l) => ({
          id: l.id,
          invoiceId: l.invoiceId,
          productId: l.productId || undefined,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          totalHT: l.totalHT,
          taxAmount: l.totalTTC - l.totalHT,
          totalTTC: l.totalTTC,
          createdAt: inv.date,
          updatedAt: inv.date,
        })),
      });
    }

    return result;
  }

  /**
   * Récupère les factures du patient connecté pour le portail patient.
   */
  async getMyPatientInvoices(
    authUserId: string,
    patientId?: string,
  ): Promise<PatientInvoiceDTO[]> {
    // 1. Find all active portal access records for this user
    const accessConditions = [
      eq(patientPortalAccess.userId, authUserId),
      eq(patientPortalAccess.isActive, true),
    ];

    if (patientId) {
      accessConditions.push(eq(patientPortalAccess.patientId, patientId));
    }

    const accessRecords = await db
      .select()
      .from(patientPortalAccess)
      .where(and(...accessConditions));

    if (accessRecords.length === 0) {
      return [];
    }

    const patientIds = accessRecords.map((a) => a.patientId);

    // 2. Find billing links for these patients
    const billingLinks = await db
      .select()
      .from(patientBillingLinks)
      .where(
        and(
          eq(patientBillingLinks.organizationId, accessRecords[0].organizationId),
        ),
      );

    const relevantLinks = billingLinks.filter((l) => patientIds.includes(l.patientId));
    const clientIds = relevantLinks.map((l) => l.clientId);

    if (clientIds.length === 0) {
      return [];
    }

    // 3. Fetch invoices
    const allInvoices: PatientInvoiceDTO[] = [];

    for (const link of relevantLinks) {
      const patientInvs = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.organizationId, link.organizationId),
            eq(invoices.clientId, link.clientId),
            eq(invoices.type, 'invoice'),
          ),
        )
        .orderBy(desc(invoices.createdAt));

      for (const inv of patientInvs) {
        const lines = await db
          .select()
          .from(invoiceLines)
          .where(eq(invoiceLines.invoiceId, inv.id));

        allInvoices.push({
          id: inv.id,
          organizationId: inv.organizationId,
          invoiceNumber: inv.number,
          issueDate: inv.date,
          dueDate: inv.dueDate || inv.date,
          status: inv.status as PatientInvoiceDTO['status'],
          totalHT: inv.totalHT,
          totalTTC: inv.totalTTC,
          currency: 'EUR',
          recipientUserId: inv.recipientUserId,
          patientId: link.patientId,
          lines: lines.map((l) => ({
            id: l.id,
            invoiceId: l.invoiceId,
            productId: l.productId || undefined,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            totalHT: l.totalHT,
            taxAmount: l.totalTTC - l.totalHT,
            totalTTC: l.totalTTC,
            createdAt: inv.date,
            updatedAt: inv.date,
          })),
        });
      }
    }

    return allInvoices;
  }
}

export const patientBillingService = new PatientBillingService();
