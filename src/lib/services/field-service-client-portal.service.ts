import 'server-only';
import crypto from 'crypto';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import {
  clients,
  fieldServiceAssets,
  fieldServiceSites,
  fieldServiceWorkOrderAssets,
  fieldServiceWorkOrders,
  fieldServiceWorkReportAcknowledgements,
  fieldServiceWorkReports,
  organizations,
} from '@/lib/db/schema';
import { AppError } from '@/lib/errors';
import type { AcknowledgeWorkReportInput } from '@/lib/validation/field-service-client-portal.schemas';

// Session 20 — portail client Field Service. La RLS (0016) est l'autorité :
// un compte client ne lit que les données de SA fiche client, hors brouillons.
// Les filtres ci-dessous reprennent ces règles pour des listes lisibles et des
// erreurs métier explicites ; ils ne remplacent jamais la base.

function ownClientsCondition(userId: string) {
  return and(eq(clients.userId, userId), eq(clients.id, fieldServiceWorkOrders.clientId), eq(clients.organizationId, fieldServiceWorkOrders.organizationId));
}

export async function listClientInterventions(userId: string) {
  return db
    .select({
      id: fieldServiceWorkOrders.id,
      reference: fieldServiceWorkOrders.reference,
      title: fieldServiceWorkOrders.title,
      workType: fieldServiceWorkOrders.workType,
      status: fieldServiceWorkOrders.status,
      scheduledStart: fieldServiceWorkOrders.scheduledStart,
      scheduledEnd: fieldServiceWorkOrders.scheduledEnd,
      actualEnd: fieldServiceWorkOrders.actualEnd,
      providerName: organizations.name,
      siteLabel: fieldServiceSites.label,
      siteCity: fieldServiceSites.city,
      awaitingAcknowledgement: sql<number>`(
        SELECT count(*)::int FROM ${fieldServiceWorkReports} r
        WHERE r.work_order_id = ${fieldServiceWorkOrders.id} AND r.status = 'finalized'
          AND NOT EXISTS (SELECT 1 FROM ${fieldServiceWorkReportAcknowledgements} a WHERE a.work_report_id = r.id)
      )`,
    })
    .from(fieldServiceWorkOrders)
    .innerJoin(clients, ownClientsCondition(userId))
    .leftJoin(organizations, eq(organizations.id, fieldServiceWorkOrders.organizationId))
    .leftJoin(fieldServiceSites, eq(fieldServiceSites.id, fieldServiceWorkOrders.siteId))
    .where(ne(fieldServiceWorkOrders.status, 'draft'))
    .orderBy(desc(sql`coalesce(${fieldServiceWorkOrders.scheduledStart}, ${fieldServiceWorkOrders.createdAt})`))
    .limit(200);
}

export async function getClientIntervention(userId: string, workOrderId: string) {
  const [order] = await db
    .select({
      id: fieldServiceWorkOrders.id,
      organizationId: fieldServiceWorkOrders.organizationId,
      reference: fieldServiceWorkOrders.reference,
      title: fieldServiceWorkOrders.title,
      description: fieldServiceWorkOrders.description,
      workType: fieldServiceWorkOrders.workType,
      status: fieldServiceWorkOrders.status,
      scheduledStart: fieldServiceWorkOrders.scheduledStart,
      scheduledEnd: fieldServiceWorkOrders.scheduledEnd,
      actualStart: fieldServiceWorkOrders.actualStart,
      actualEnd: fieldServiceWorkOrders.actualEnd,
      providerName: organizations.name,
      providerEmail: organizations.email,
      providerPhone: organizations.phone,
      siteLabel: fieldServiceSites.label,
      siteAddressLine1: fieldServiceSites.addressLine1,
      sitePostalCode: fieldServiceSites.postalCode,
      siteCity: fieldServiceSites.city,
    })
    .from(fieldServiceWorkOrders)
    .innerJoin(clients, ownClientsCondition(userId))
    .leftJoin(organizations, eq(organizations.id, fieldServiceWorkOrders.organizationId))
    .leftJoin(fieldServiceSites, eq(fieldServiceSites.id, fieldServiceWorkOrders.siteId))
    .where(and(eq(fieldServiceWorkOrders.id, workOrderId), ne(fieldServiceWorkOrders.status, 'draft')))
    .limit(1);
  if (!order) return null;

  const [reports, assets] = await Promise.all([
    db
      .select({
        id: fieldServiceWorkReports.id,
        summary: fieldServiceWorkReports.summary,
        workPerformed: fieldServiceWorkReports.workPerformed,
        issuesFound: fieldServiceWorkReports.issuesFound,
        recommendations: fieldServiceWorkReports.recommendations,
        customerNotes: fieldServiceWorkReports.customerNotes,
        finalizedAt: fieldServiceWorkReports.finalizedAt,
        ackSignerName: fieldServiceWorkReportAcknowledgements.signerName,
        ackDecision: fieldServiceWorkReportAcknowledgements.decision,
        ackComment: fieldServiceWorkReportAcknowledgements.comment,
        acknowledgedAt: fieldServiceWorkReportAcknowledgements.acknowledgedAt,
      })
      .from(fieldServiceWorkReports)
      .leftJoin(fieldServiceWorkReportAcknowledgements, eq(fieldServiceWorkReportAcknowledgements.workReportId, fieldServiceWorkReports.id))
      .where(and(eq(fieldServiceWorkReports.workOrderId, order.id), eq(fieldServiceWorkReports.status, 'finalized')))
      .orderBy(asc(fieldServiceWorkReports.finalizedAt)),
    db
      .select({
        id: fieldServiceAssets.id,
        label: fieldServiceAssets.label,
        category: fieldServiceAssets.category,
        manufacturer: fieldServiceAssets.manufacturer,
        model: fieldServiceAssets.model,
        serialNumber: fieldServiceAssets.serialNumber,
      })
      .from(fieldServiceWorkOrderAssets)
      .innerJoin(fieldServiceAssets, eq(fieldServiceAssets.id, fieldServiceWorkOrderAssets.assetId))
      .where(eq(fieldServiceWorkOrderAssets.workOrderId, order.id))
      .orderBy(asc(fieldServiceAssets.label)),
  ]);

  return { ...order, reports, assets };
}

export async function listClientAssets(userId: string) {
  const ownClient = and(eq(clients.userId, userId), eq(clients.id, fieldServiceAssets.clientId), eq(clients.organizationId, fieldServiceAssets.organizationId));
  const assets = await db
    .select({
      id: fieldServiceAssets.id,
      label: fieldServiceAssets.label,
      category: fieldServiceAssets.category,
      manufacturer: fieldServiceAssets.manufacturer,
      model: fieldServiceAssets.model,
      serialNumber: fieldServiceAssets.serialNumber,
      status: fieldServiceAssets.status,
      warrantyEndsOn: fieldServiceAssets.warrantyEndsOn,
      nextMaintenanceOn: fieldServiceAssets.nextMaintenanceOn,
      providerName: organizations.name,
      siteLabel: fieldServiceSites.label,
      siteCity: fieldServiceSites.city,
    })
    .from(fieldServiceAssets)
    .innerJoin(clients, ownClient)
    .leftJoin(organizations, eq(organizations.id, fieldServiceAssets.organizationId))
    .leftJoin(fieldServiceSites, eq(fieldServiceSites.id, fieldServiceAssets.siteId))
    .orderBy(asc(organizations.name), asc(fieldServiceAssets.label))
    .limit(500);

  const assetIds = assets.map((a) => a.id);
  const history = assetIds.length
    ? await db
        .select({
          assetId: fieldServiceWorkOrderAssets.assetId,
          workOrderId: fieldServiceWorkOrders.id,
          reference: fieldServiceWorkOrders.reference,
          title: fieldServiceWorkOrders.title,
          status: fieldServiceWorkOrders.status,
          date: sql<string>`to_json(coalesce(${fieldServiceWorkOrders.actualEnd}, ${fieldServiceWorkOrders.scheduledStart}, ${fieldServiceWorkOrders.createdAt})) #>> '{}'`,
        })
        .from(fieldServiceWorkOrderAssets)
        .innerJoin(fieldServiceWorkOrders, eq(fieldServiceWorkOrders.id, fieldServiceWorkOrderAssets.workOrderId))
        .where(and(inArray(fieldServiceWorkOrderAssets.assetId, assetIds), ne(fieldServiceWorkOrders.status, 'draft')))
        .orderBy(desc(sql`coalesce(${fieldServiceWorkOrders.actualEnd}, ${fieldServiceWorkOrders.scheduledStart}, ${fieldServiceWorkOrders.createdAt})`))
    : [];

  return assets.map((asset) => ({ ...asset, interventions: history.filter((h) => h.assetId === asset.id) }));
}

/**
 * Réception des travaux par le client relié. La base impose : compte rendu
 * finalisé de SA fiche, signataire = session, une seule réception, immuable.
 */
export async function acknowledgeWorkReport(userId: string, input: AcknowledgeWorkReportInput) {
  const [report] = await db
    .select({
      id: fieldServiceWorkReports.id,
      organizationId: fieldServiceWorkReports.organizationId,
      workOrderId: fieldServiceWorkReports.workOrderId,
      ackId: fieldServiceWorkReportAcknowledgements.id,
    })
    .from(fieldServiceWorkReports)
    .innerJoin(fieldServiceWorkOrders, eq(fieldServiceWorkOrders.id, fieldServiceWorkReports.workOrderId))
    .innerJoin(clients, ownClientsCondition(userId))
    .leftJoin(fieldServiceWorkReportAcknowledgements, eq(fieldServiceWorkReportAcknowledgements.workReportId, fieldServiceWorkReports.id))
    .where(and(eq(fieldServiceWorkReports.id, input.workReportId), eq(fieldServiceWorkReports.status, 'finalized')))
    .limit(1);

  if (!report) throw new AppError('Compte rendu introuvable', 404, 'REPORT_NOT_FOUND');
  if (report.ackId) throw new AppError('Ce compte rendu a déjà été réceptionné', 409, 'REPORT_ALREADY_ACKNOWLEDGED');

  await db.insert(fieldServiceWorkReportAcknowledgements).values({
    id: crypto.randomUUID(),
    organizationId: report.organizationId,
    workReportId: report.id,
    acknowledgedByUserId: userId,
    signerName: input.signerName,
    decision: input.decision,
    comment: input.comment ?? null,
  });
  return { workOrderId: report.workOrderId };
}

/** Réceptions visibles par le professionnel sur une opération de son organisation. */
export async function listWorkOrderAcknowledgements(organizationId: string, workOrderId: string) {
  return db
    .select({
      workReportId: fieldServiceWorkReportAcknowledgements.workReportId,
      signerName: fieldServiceWorkReportAcknowledgements.signerName,
      decision: fieldServiceWorkReportAcknowledgements.decision,
      comment: fieldServiceWorkReportAcknowledgements.comment,
      acknowledgedAt: fieldServiceWorkReportAcknowledgements.acknowledgedAt,
      reportSummary: fieldServiceWorkReports.summary,
    })
    .from(fieldServiceWorkReportAcknowledgements)
    .innerJoin(fieldServiceWorkReports, eq(fieldServiceWorkReports.id, fieldServiceWorkReportAcknowledgements.workReportId))
    .where(and(
      eq(fieldServiceWorkReportAcknowledgements.organizationId, organizationId),
      eq(fieldServiceWorkReports.workOrderId, workOrderId),
    ))
    .orderBy(asc(fieldServiceWorkReportAcknowledgements.acknowledgedAt));
}
