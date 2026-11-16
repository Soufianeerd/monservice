import 'server-only';
import crypto from 'crypto';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import {
  clients,
  fieldServiceAssets,
  fieldServiceSites,
  fieldServiceWorkOrderAssets,
  fieldServiceWorkOrders,
  fieldServiceWorkReports,
} from '@/lib/db/schema';
import { AppError } from '@/lib/errors';
import type {
  CreateFieldServiceAssetInput,
  ListFieldServiceAssetsInput,
  UpdateFieldServiceAssetInput,
} from '@/lib/validation/field-service-assets.schemas';
import { MAINTENANCE_ALERT_DAYS, WARRANTY_ALERT_DAYS, addMonthsIso } from '@/lib/workspaces/field-service/assets';
import { createFieldServiceWorkOrder } from '@/lib/services/field-service-operations.service';

// Session 19 — équipements clients. Toutes les fonctions reçoivent
// l'organisation de la session : la RLS reste la barrière de dernier recours,
// ces filtres explicites donnent des erreurs métier lisibles.

/** Statuts d'opération pour lesquels l'historique des équipements est figé. */
const CLOSED_WORK_ORDER_STATUSES = ['completed', 'cancelled'];

function postgresCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  if ('code' in err && typeof err.code === 'string') return err.code;
  if ('cause' in err) return postgresCode(err.cause);
  return undefined;
}

async function assertClientInOrganization(organizationId: string, clientId: string) {
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
    .limit(1);
  if (!client) throw new AppError('Client introuvable dans cette organisation', 404, 'CLIENT_NOT_FOUND');
}

async function assertSiteOfClient(organizationId: string, clientId: string, siteId: string) {
  const [site] = await db
    .select({ id: fieldServiceSites.id })
    .from(fieldServiceSites)
    .where(and(
      eq(fieldServiceSites.id, siteId),
      eq(fieldServiceSites.organizationId, organizationId),
      eq(fieldServiceSites.clientId, clientId),
    ))
    .limit(1);
  if (!site) throw new AppError('Ce site n’appartient pas à ce client', 422, 'ASSET_SITE_MISMATCH');
}

function mapUniqueViolation(err: unknown): never {
  if (postgresCode(err) === '23505') {
    throw new AppError('Un équipement de ce fabricant porte déjà ce numéro de série', 409, 'ASSET_SERIAL_DUPLICATE');
  }
  throw err;
}

/** Première échéance : celle saisie, sinon mise en service (ou aujourd'hui) + périodicité. */
function initialNextMaintenance(input: CreateFieldServiceAssetInput): string | null {
  if (input.nextMaintenanceOn) return input.nextMaintenanceOn;
  if (!input.maintenanceIntervalMonths) return null;
  const base = input.installedOn ?? new Date().toISOString().slice(0, 10);
  return addMonthsIso(base, input.maintenanceIntervalMonths);
}

export async function createFieldServiceAsset(organizationId: string, input: CreateFieldServiceAssetInput) {
  await assertClientInOrganization(organizationId, input.clientId);
  if (input.siteId) await assertSiteOfClient(organizationId, input.clientId, input.siteId);

  try {
    const [asset] = await db
      .insert(fieldServiceAssets)
      .values({
        id: crypto.randomUUID(),
        organizationId,
        clientId: input.clientId,
        siteId: input.siteId ?? null,
        category: input.category,
        label: input.label,
        manufacturer: input.manufacturer ?? null,
        model: input.model ?? null,
        serialNumber: input.serialNumber ?? null,
        installedOn: input.installedOn ?? null,
        warrantyEndsOn: input.warrantyEndsOn ?? null,
        notes: input.notes ?? null,
        maintenanceIntervalMonths: input.maintenanceIntervalMonths ?? null,
        nextMaintenanceOn: initialNextMaintenance(input),
        status: 'active',
      })
      .returning();
    return asset;
  } catch (err) {
    return mapUniqueViolation(err);
  }
}

export async function updateFieldServiceAsset(organizationId: string, input: UpdateFieldServiceAssetInput) {
  const [existing] = await db
    .select({
      id: fieldServiceAssets.id,
      clientId: fieldServiceAssets.clientId,
      status: fieldServiceAssets.status,
      installedOn: fieldServiceAssets.installedOn,
      warrantyEndsOn: fieldServiceAssets.warrantyEndsOn,
    })
    .from(fieldServiceAssets)
    .where(and(eq(fieldServiceAssets.id, input.id), eq(fieldServiceAssets.organizationId, organizationId)))
    .limit(1);

  if (!existing) throw new AppError('Équipement introuvable', 404, 'ASSET_NOT_FOUND');
  if (existing.status === 'decommissioned') {
    throw new AppError('Un équipement retiré ne peut plus être modifié', 409, 'ASSET_DECOMMISSIONED');
  }
  if (input.siteId) await assertSiteOfClient(organizationId, existing.clientId, input.siteId);

  const installedOn = input.installedOn !== undefined ? input.installedOn : existing.installedOn;
  const warrantyEndsOn = input.warrantyEndsOn !== undefined ? input.warrantyEndsOn : existing.warrantyEndsOn;
  if (installedOn && warrantyEndsOn && warrantyEndsOn < installedOn) {
    throw new AppError('La fin de garantie ne peut pas précéder la mise en service', 422, 'ASSET_WARRANTY_DATES');
  }

  const values: Partial<typeof fieldServiceAssets.$inferInsert> = {};
  if (input.siteId !== undefined) values.siteId = input.siteId;
  if (input.category !== undefined) values.category = input.category;
  if (input.label !== undefined) values.label = input.label;
  if (input.manufacturer !== undefined) values.manufacturer = input.manufacturer;
  if (input.model !== undefined) values.model = input.model;
  if (input.serialNumber !== undefined) values.serialNumber = input.serialNumber;
  if (input.installedOn !== undefined) values.installedOn = input.installedOn;
  if (input.warrantyEndsOn !== undefined) values.warrantyEndsOn = input.warrantyEndsOn;
  if (input.notes !== undefined) values.notes = input.notes;
  if (input.status !== undefined) values.status = input.status;
  if (input.maintenanceIntervalMonths !== undefined) {
    values.maintenanceIntervalMonths = input.maintenanceIntervalMonths;
    // Sans périodicité, il n'y a plus d'échéance automatique à suivre.
    if (input.maintenanceIntervalMonths === null && input.nextMaintenanceOn === undefined) values.nextMaintenanceOn = null;
  }
  if (input.nextMaintenanceOn !== undefined) values.nextMaintenanceOn = input.nextMaintenanceOn;

  if (Object.keys(values).length === 0) {
    throw new AppError('Aucune modification fournie', 400, 'ASSET_NO_CHANGES');
  }

  try {
    const [updated] = await db
      .update(fieldServiceAssets)
      .set(values)
      .where(and(eq(fieldServiceAssets.id, input.id), eq(fieldServiceAssets.organizationId, organizationId)))
      .returning();
    return updated;
  } catch (err) {
    return mapUniqueViolation(err);
  }
}

const interventionCount = sql<number>`(
  SELECT count(*)::int FROM ${fieldServiceWorkOrderAssets} l
  WHERE l.asset_id = ${fieldServiceAssets.id} AND l.organization_id = ${fieldServiceAssets.organizationId}
)`;

const lastInterventionAt = sql<string | null>`(
  SELECT to_json(max(coalesce(w.actual_end, w.scheduled_start, w.created_at))) #>> '{}'
  FROM ${fieldServiceWorkOrderAssets} l
  JOIN ${fieldServiceWorkOrders} w ON w.id = l.work_order_id AND w.organization_id = l.organization_id
  WHERE l.asset_id = ${fieldServiceAssets.id} AND l.organization_id = ${fieldServiceAssets.organizationId}
    AND w.status <> 'cancelled'
)`;

export async function listFieldServiceAssets(organizationId: string, filters: ListFieldServiceAssetsInput = {}) {
  const conditions = [eq(fieldServiceAssets.organizationId, organizationId)];
  if (filters.clientId) conditions.push(eq(fieldServiceAssets.clientId, filters.clientId));
  if (filters.siteId) conditions.push(eq(fieldServiceAssets.siteId, filters.siteId));
  if (filters.status) conditions.push(eq(fieldServiceAssets.status, filters.status));
  if (filters.category) conditions.push(eq(fieldServiceAssets.category, filters.category));
  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const searchCondition = or(
      ilike(fieldServiceAssets.label, pattern),
      ilike(fieldServiceAssets.serialNumber, pattern),
      ilike(fieldServiceAssets.manufacturer, pattern),
      ilike(fieldServiceAssets.model, pattern),
      ilike(clients.name, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  return db
    .select({
      id: fieldServiceAssets.id,
      clientId: fieldServiceAssets.clientId,
      siteId: fieldServiceAssets.siteId,
      category: fieldServiceAssets.category,
      label: fieldServiceAssets.label,
      manufacturer: fieldServiceAssets.manufacturer,
      model: fieldServiceAssets.model,
      serialNumber: fieldServiceAssets.serialNumber,
      installedOn: fieldServiceAssets.installedOn,
      warrantyEndsOn: fieldServiceAssets.warrantyEndsOn,
      maintenanceIntervalMonths: fieldServiceAssets.maintenanceIntervalMonths,
      nextMaintenanceOn: fieldServiceAssets.nextMaintenanceOn,
      status: fieldServiceAssets.status,
      createdAt: fieldServiceAssets.createdAt,
      clientName: clients.name,
      siteLabel: fieldServiceSites.label,
      siteCity: fieldServiceSites.city,
      interventionCount,
      lastInterventionAt,
    })
    .from(fieldServiceAssets)
    .leftJoin(clients, eq(clients.id, fieldServiceAssets.clientId))
    .leftJoin(fieldServiceSites, eq(fieldServiceSites.id, fieldServiceAssets.siteId))
    .where(and(...conditions))
    .orderBy(asc(clients.name), asc(fieldServiceAssets.label))
    .limit(500);
}

export async function getFieldServiceAssetById(organizationId: string, assetId: string) {
  const [asset] = await db
    .select({
      id: fieldServiceAssets.id,
      clientId: fieldServiceAssets.clientId,
      siteId: fieldServiceAssets.siteId,
      category: fieldServiceAssets.category,
      label: fieldServiceAssets.label,
      manufacturer: fieldServiceAssets.manufacturer,
      model: fieldServiceAssets.model,
      serialNumber: fieldServiceAssets.serialNumber,
      installedOn: fieldServiceAssets.installedOn,
      warrantyEndsOn: fieldServiceAssets.warrantyEndsOn,
      status: fieldServiceAssets.status,
      notes: fieldServiceAssets.notes,
      maintenanceIntervalMonths: fieldServiceAssets.maintenanceIntervalMonths,
      nextMaintenanceOn: fieldServiceAssets.nextMaintenanceOn,
      createdAt: fieldServiceAssets.createdAt,
      updatedAt: fieldServiceAssets.updatedAt,
      clientName: clients.name,
      siteLabel: fieldServiceSites.label,
      siteAddressLine1: fieldServiceSites.addressLine1,
      sitePostalCode: fieldServiceSites.postalCode,
      siteCity: fieldServiceSites.city,
    })
    .from(fieldServiceAssets)
    .leftJoin(clients, eq(clients.id, fieldServiceAssets.clientId))
    .leftJoin(fieldServiceSites, eq(fieldServiceSites.id, fieldServiceAssets.siteId))
    .where(and(eq(fieldServiceAssets.id, assetId), eq(fieldServiceAssets.organizationId, organizationId)))
    .limit(1);

  if (!asset) return null;

  const interventions = await db
    .select({
      workOrderId: fieldServiceWorkOrders.id,
      reference: fieldServiceWorkOrders.reference,
      title: fieldServiceWorkOrders.title,
      workType: fieldServiceWorkOrders.workType,
      status: fieldServiceWorkOrders.status,
      scheduledStart: fieldServiceWorkOrders.scheduledStart,
      actualEnd: fieldServiceWorkOrders.actualEnd,
      createdAt: fieldServiceWorkOrders.createdAt,
      linkedAt: fieldServiceWorkOrderAssets.createdAt,
    })
    .from(fieldServiceWorkOrderAssets)
    .innerJoin(
      fieldServiceWorkOrders,
      and(
        eq(fieldServiceWorkOrders.id, fieldServiceWorkOrderAssets.workOrderId),
        eq(fieldServiceWorkOrders.organizationId, fieldServiceWorkOrderAssets.organizationId),
      ),
    )
    .where(and(
      eq(fieldServiceWorkOrderAssets.assetId, assetId),
      eq(fieldServiceWorkOrderAssets.organizationId, organizationId),
    ))
    .orderBy(desc(sql`coalesce(${fieldServiceWorkOrders.actualEnd}, ${fieldServiceWorkOrders.scheduledStart}, ${fieldServiceWorkOrders.createdAt})`));

  // Résumés des comptes rendus finalisés (les brouillons restent internes à l'opération).
  const workOrderIds = interventions.map((i) => i.workOrderId);
  const reports = workOrderIds.length
    ? await db
        .select({
          workOrderId: fieldServiceWorkReports.workOrderId,
          summary: fieldServiceWorkReports.summary,
          finalizedAt: fieldServiceWorkReports.finalizedAt,
        })
        .from(fieldServiceWorkReports)
        .where(and(
          eq(fieldServiceWorkReports.organizationId, organizationId),
          eq(fieldServiceWorkReports.status, 'finalized'),
          inArray(fieldServiceWorkReports.workOrderId, workOrderIds),
        ))
    : [];

  const reportByWorkOrder = new Map(reports.map((r) => [r.workOrderId, r]));
  return {
    ...asset,
    interventions: interventions.map((i) => ({
      ...i,
      reportSummary: reportByWorkOrder.get(i.workOrderId)?.summary ?? null,
      reportFinalizedAt: reportByWorkOrder.get(i.workOrderId)?.finalizedAt ?? null,
    })),
  };
}

async function loadLinkContext(organizationId: string, workOrderId: string, assetId: string) {
  const [workOrder] = await db
    .select({ id: fieldServiceWorkOrders.id, clientId: fieldServiceWorkOrders.clientId, status: fieldServiceWorkOrders.status })
    .from(fieldServiceWorkOrders)
    .where(and(eq(fieldServiceWorkOrders.id, workOrderId), eq(fieldServiceWorkOrders.organizationId, organizationId)))
    .limit(1);
  if (!workOrder) throw new AppError('Opération introuvable', 404, 'WORK_ORDER_NOT_FOUND');

  const [asset] = await db
    .select({ id: fieldServiceAssets.id, clientId: fieldServiceAssets.clientId, status: fieldServiceAssets.status })
    .from(fieldServiceAssets)
    .where(and(eq(fieldServiceAssets.id, assetId), eq(fieldServiceAssets.organizationId, organizationId)))
    .limit(1);
  if (!asset) throw new AppError('Équipement introuvable', 404, 'ASSET_NOT_FOUND');

  return { workOrder, asset };
}

export async function linkAssetToWorkOrder(organizationId: string, workOrderId: string, assetId: string) {
  const { workOrder, asset } = await loadLinkContext(organizationId, workOrderId, assetId);
  if (asset.clientId !== workOrder.clientId) {
    throw new AppError('L’équipement et l’opération concernent des clients différents', 422, 'ASSET_CLIENT_MISMATCH');
  }
  if (asset.status === 'decommissioned') {
    throw new AppError('Un équipement retiré ne peut pas être ajouté à une opération', 409, 'ASSET_DECOMMISSIONED');
  }
  if (CLOSED_WORK_ORDER_STATUSES.includes(workOrder.status)) {
    throw new AppError('Une opération terminée ou annulée ne peut plus être modifiée', 409, 'WORK_ORDER_CLOSED');
  }

  try {
    const [link] = await db
      .insert(fieldServiceWorkOrderAssets)
      .values({ id: crypto.randomUUID(), organizationId, clientId: workOrder.clientId, workOrderId, assetId })
      .returning();
    return link;
  } catch (err) {
    if (postgresCode(err) === '23505') {
      throw new AppError('Cet équipement est déjà rattaché à cette opération', 409, 'ASSET_ALREADY_LINKED');
    }
    throw err;
  }
}

export async function unlinkAssetFromWorkOrder(organizationId: string, workOrderId: string, assetId: string) {
  const { workOrder } = await loadLinkContext(organizationId, workOrderId, assetId);
  if (CLOSED_WORK_ORDER_STATUSES.includes(workOrder.status)) {
    throw new AppError('L’historique d’une opération terminée ou annulée est figé', 409, 'WORK_ORDER_CLOSED');
  }
  const deleted = await db
    .delete(fieldServiceWorkOrderAssets)
    .where(and(
      eq(fieldServiceWorkOrderAssets.organizationId, organizationId),
      eq(fieldServiceWorkOrderAssets.workOrderId, workOrderId),
      eq(fieldServiceWorkOrderAssets.assetId, assetId),
    ))
    .returning({ id: fieldServiceWorkOrderAssets.id });
  if (deleted.length === 0) throw new AppError('Cet équipement n’est pas rattaché à cette opération', 404, 'ASSET_LINK_NOT_FOUND');
  return { success: true as const };
}

export async function listAssetsForWorkOrder(organizationId: string, workOrderId: string) {
  return db
    .select({
      id: fieldServiceAssets.id,
      label: fieldServiceAssets.label,
      category: fieldServiceAssets.category,
      manufacturer: fieldServiceAssets.manufacturer,
      model: fieldServiceAssets.model,
      serialNumber: fieldServiceAssets.serialNumber,
      status: fieldServiceAssets.status,
      warrantyEndsOn: fieldServiceAssets.warrantyEndsOn,
    })
    .from(fieldServiceWorkOrderAssets)
    .innerJoin(
      fieldServiceAssets,
      and(
        eq(fieldServiceAssets.id, fieldServiceWorkOrderAssets.assetId),
        eq(fieldServiceAssets.organizationId, fieldServiceWorkOrderAssets.organizationId),
      ),
    )
    .where(and(
      eq(fieldServiceWorkOrderAssets.organizationId, organizationId),
      eq(fieldServiceWorkOrderAssets.workOrderId, workOrderId),
    ))
    .orderBy(asc(fieldServiceAssets.label));
}

/** Indicateurs du parc à une date de référence (AAAA-MM-JJ). */
export async function getFieldServiceAssetMetrics(organizationId: string, today: string) {
  const [row] = await db
    .select({
      total: sql<number>`count(*) FILTER (WHERE ${fieldServiceAssets.status} <> 'decommissioned')::int`,
      outOfService: sql<number>`count(*) FILTER (WHERE ${fieldServiceAssets.status} = 'out_of_service')::int`,
      warrantyExpiring: sql<number>`count(*) FILTER (WHERE ${fieldServiceAssets.status} <> 'decommissioned' AND ${fieldServiceAssets.warrantyEndsOn} >= ${today}::date AND ${fieldServiceAssets.warrantyEndsOn} <= ${today}::date + ${WARRANTY_ALERT_DAYS}::int)::int`,
      maintenanceDue: sql<number>`count(*) FILTER (WHERE ${fieldServiceAssets.status} <> 'decommissioned' AND ${fieldServiceAssets.nextMaintenanceOn} <= ${today}::date + ${MAINTENANCE_ALERT_DAYS}::int)::int`,
    })
    .from(fieldServiceAssets)
    .where(eq(fieldServiceAssets.organizationId, organizationId));
  return row ?? { total: 0, outOfService: 0, warrantyExpiring: 0, maintenanceDue: 0 };
}

/**
 * Crée l'opération d'entretien d'un équipement (type « maintenance », même
 * client et même site) puis l'y rattache. À la clôture de cette opération, le
 * trigger SQL recalcule la prochaine échéance selon la périodicité.
 */
export async function scheduleAssetMaintenance(
  organizationId: string,
  createdByUserId: string,
  assetId: string,
  scheduledStart?: string | null,
) {
  const [asset] = await db
    .select({
      id: fieldServiceAssets.id,
      clientId: fieldServiceAssets.clientId,
      siteId: fieldServiceAssets.siteId,
      label: fieldServiceAssets.label,
      status: fieldServiceAssets.status,
    })
    .from(fieldServiceAssets)
    .where(and(eq(fieldServiceAssets.id, assetId), eq(fieldServiceAssets.organizationId, organizationId)))
    .limit(1);
  if (!asset) throw new AppError('Équipement introuvable', 404, 'ASSET_NOT_FOUND');
  if (asset.status === 'decommissioned') {
    throw new AppError('Un équipement retiré ne peut plus être entretenu', 409, 'ASSET_DECOMMISSIONED');
  }

  let scheduledEnd: string | null = null;
  if (scheduledStart) {
    const end = new Date(scheduledStart);
    end.setHours(end.getHours() + 2);
    scheduledEnd = end.toISOString();
  }

  const workOrder = await createFieldServiceWorkOrder(organizationId, createdByUserId, {
    clientId: asset.clientId,
    siteId: asset.siteId,
    title: `Entretien — ${asset.label}`.slice(0, 200),
    workType: 'maintenance',
    priority: 'medium',
    scheduledStart: scheduledStart ?? null,
    scheduledEnd,
  });
  await linkAssetToWorkOrder(organizationId, workOrder.id, asset.id);
  return { workOrderId: workOrder.id };
}
