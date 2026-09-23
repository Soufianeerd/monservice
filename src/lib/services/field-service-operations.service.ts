import 'server-only';
import { db } from '@/lib/db/server';
import {
  fieldServiceSites,
  fieldServiceWorkOrders,
  fieldServiceWorkOrderAssignments,
  fieldServiceWorkReports,
  fieldServiceWorkOrderStatusHistory,
  clients,
  users,
} from '@/lib/db/schema';
import { eq, and, desc, sql, ilike, or, gte, lte, asc } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import crypto from 'crypto';

// ============================================================================
// Reference Generator
// ============================================================================

export function generateWorkOrderReference(): string {
  const year = new Date().getFullYear();
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `WO-${year}-${randomSuffix}`;
}

// ============================================================================
// Sites Operations
// ============================================================================

export async function createFieldServiceSite(
  organizationId: string,
  data: {
    clientId: string;
    label: string;
    addressLine1: string;
    addressLine2?: string | null;
    postalCode: string;
    city: string;
    country?: string;
    latitude?: number | null;
    longitude?: number | null;
    accessInstructions?: string | null;
  }
) {
  // 1. Verify client belongs to organization
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, data.clientId), eq(clients.organizationId, organizationId)))
    .limit(1);

  if (!client) {
    throw new AppError('Client introuvable dans cette organisation', 404, 'CLIENT_NOT_FOUND');
  }

  const siteId = crypto.randomUUID();

  const [site] = await db
    .insert(fieldServiceSites)
    .values({
      id: siteId,
      organizationId,
      clientId: data.clientId,
      label: data.label.trim(),
      addressLine1: data.addressLine1.trim(),
      addressLine2: data.addressLine2 ? data.addressLine2.trim() : null,
      postalCode: data.postalCode.trim(),
      city: data.city.trim(),
      country: (data.country || 'FR').toUpperCase(),
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      accessInstructions: data.accessInstructions ? data.accessInstructions.trim() : null,
      isActive: true,
    })
    .returning();

  return site;
}

export async function updateFieldServiceSite(
  organizationId: string,
  siteId: string,
  data: {
    label?: string;
    addressLine1?: string;
    addressLine2?: string | null;
    postalCode?: string;
    city?: string;
    country?: string;
    latitude?: number | null;
    longitude?: number | null;
    accessInstructions?: string | null;
    isActive?: boolean;
  }
) {
  const [existing] = await db
    .select({ id: fieldServiceSites.id })
    .from(fieldServiceSites)
    .where(and(eq(fieldServiceSites.id, siteId), eq(fieldServiceSites.organizationId, organizationId)))
    .limit(1);

  if (!existing) {
    throw new AppError('Site introuvable', 404, 'SITE_NOT_FOUND');
  }

  const updateValues: Partial<typeof fieldServiceSites.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.label !== undefined) updateValues.label = data.label.trim();
  if (data.addressLine1 !== undefined) updateValues.addressLine1 = data.addressLine1.trim();
  if (data.addressLine2 !== undefined) updateValues.addressLine2 = data.addressLine2 ? data.addressLine2.trim() : null;
  if (data.postalCode !== undefined) updateValues.postalCode = data.postalCode.trim();
  if (data.city !== undefined) updateValues.city = data.city.trim();
  if (data.country !== undefined) updateValues.country = data.country.toUpperCase();
  if (data.latitude !== undefined) updateValues.latitude = data.latitude;
  if (data.longitude !== undefined) updateValues.longitude = data.longitude;
  if (data.accessInstructions !== undefined) updateValues.accessInstructions = data.accessInstructions ? data.accessInstructions.trim() : null;
  if (data.isActive !== undefined) updateValues.isActive = data.isActive;

  const [updated] = await db
    .update(fieldServiceSites)
    .set(updateValues)
    .where(and(eq(fieldServiceSites.id, siteId), eq(fieldServiceSites.organizationId, organizationId)))
    .returning();

  return updated;
}

export async function listFieldServiceSites(
  organizationId: string,
  options?: { clientId?: string; isActive?: boolean }
) {
  const conditions = [eq(fieldServiceSites.organizationId, organizationId)];

  if (options?.clientId) {
    conditions.push(eq(fieldServiceSites.clientId, options.clientId));
  }
  if (options?.isActive !== undefined) {
    conditions.push(eq(fieldServiceSites.isActive, options.isActive));
  }

  return db
    .select({
      id: fieldServiceSites.id,
      organizationId: fieldServiceSites.organizationId,
      clientId: fieldServiceSites.clientId,
      label: fieldServiceSites.label,
      addressLine1: fieldServiceSites.addressLine1,
      addressLine2: fieldServiceSites.addressLine2,
      postalCode: fieldServiceSites.postalCode,
      city: fieldServiceSites.city,
      country: fieldServiceSites.country,
      latitude: fieldServiceSites.latitude,
      longitude: fieldServiceSites.longitude,
      accessInstructions: fieldServiceSites.accessInstructions,
      isActive: fieldServiceSites.isActive,
      createdAt: fieldServiceSites.createdAt,
      updatedAt: fieldServiceSites.updatedAt,
      clientName: clients.name,
    })
    .from(fieldServiceSites)
    .leftJoin(clients, eq(clients.id, fieldServiceSites.clientId))
    .where(and(...conditions))
    .orderBy(asc(fieldServiceSites.label));
}

// ============================================================================
// Work Orders Operations
// ============================================================================

export async function createFieldServiceWorkOrder(
  organizationId: string,
  createdByUserId: string,
  data: {
    clientId: string;
    siteId?: string | null;
    title: string;
    description?: string | null;
    workType?: 'job' | 'intervention' | 'installation' | 'maintenance' | 'repair' | 'inspection' | 'project' | 'other';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
  }
) {
  // 1. Validate client belongs to organization
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, data.clientId), eq(clients.organizationId, organizationId)))
    .limit(1);

  if (!client) {
    throw new AppError('Client introuvable dans cette organisation', 404, 'CLIENT_NOT_FOUND');
  }

  // 2. If site provided, validate site belongs to client and organization
  if (data.siteId) {
    const [site] = await db
      .select({ id: fieldServiceSites.id })
      .from(fieldServiceSites)
      .where(
        and(
          eq(fieldServiceSites.id, data.siteId),
          eq(fieldServiceSites.organizationId, organizationId),
          eq(fieldServiceSites.clientId, data.clientId)
        )
      )
      .limit(1);

    if (!site) {
      throw new AppError('Site introuvable pour ce client', 400, 'INVALID_SITE_FOR_CLIENT');
    }
  }

  const workOrderId = crypto.randomUUID();
  const initialStatus = data.scheduledStart ? 'scheduled' : 'draft';

  // Retry up to 3 times in case of reference collision
  for (let attempt = 0; attempt < 3; attempt++) {
    const reference = generateWorkOrderReference();
    try {
      const [order] = await db
        .insert(fieldServiceWorkOrders)
        .values({
          id: workOrderId,
          organizationId,
          clientId: data.clientId,
          siteId: data.siteId ?? null,
          createdByUserId,
          reference,
          title: data.title.trim(),
          description: data.description ? data.description.trim() : null,
          workType: data.workType ?? 'intervention',
          status: initialStatus,
          priority: data.priority ?? 'medium',
          scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
          scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
        })
        .returning();

      return order;
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error?.code === '23505' && attempt < 2) {
        continue;
      }
      throw err;
    }
  }

  throw new AppError('Échec de la génération de référence d’opération', 500, 'REFERENCE_GENERATION_FAILED');
}

export async function updateFieldServiceWorkOrder(
  organizationId: string,
  workOrderId: string,
  data: {
    siteId?: string | null;
    title?: string;
    description?: string | null;
    workType?: 'job' | 'intervention' | 'installation' | 'maintenance' | 'repair' | 'inspection' | 'project' | 'other';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
  }
) {
  const [existing] = await db
    .select({
      id: fieldServiceWorkOrders.id,
      clientId: fieldServiceWorkOrders.clientId,
      status: fieldServiceWorkOrders.status,
    })
    .from(fieldServiceWorkOrders)
    .where(and(eq(fieldServiceWorkOrders.id, workOrderId), eq(fieldServiceWorkOrders.organizationId, organizationId)))
    .limit(1);

  if (!existing) {
    throw new AppError('Opération introuvable', 404, 'WORK_ORDER_NOT_FOUND');
  }

  if (existing.status === 'completed' || existing.status === 'cancelled') {
    throw new AppError('Impossible de modifier une opération terminée ou annulée', 400, 'WORK_ORDER_TERMINAL');
  }

  if (data.siteId !== undefined && data.siteId !== null) {
    const [site] = await db
      .select({ id: fieldServiceSites.id })
      .from(fieldServiceSites)
      .where(
        and(
          eq(fieldServiceSites.id, data.siteId),
          eq(fieldServiceSites.organizationId, organizationId),
          eq(fieldServiceSites.clientId, existing.clientId)
        )
      )
      .limit(1);

    if (!site) {
      throw new AppError('Site introuvable pour ce client', 400, 'INVALID_SITE_FOR_CLIENT');
    }
  }

  const updateValues: Partial<typeof fieldServiceWorkOrders.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.siteId !== undefined) updateValues.siteId = data.siteId;
  if (data.title !== undefined) updateValues.title = data.title.trim();
  if (data.description !== undefined) updateValues.description = data.description ? data.description.trim() : null;
  if (data.workType !== undefined) updateValues.workType = data.workType;
  if (data.priority !== undefined) updateValues.priority = data.priority;
  if (data.scheduledStart !== undefined) updateValues.scheduledStart = data.scheduledStart ? new Date(data.scheduledStart) : null;
  if (data.scheduledEnd !== undefined) updateValues.scheduledEnd = data.scheduledEnd ? new Date(data.scheduledEnd) : null;

  const [updated] = await db
    .update(fieldServiceWorkOrders)
    .set(updateValues)
    .where(and(eq(fieldServiceWorkOrders.id, workOrderId), eq(fieldServiceWorkOrders.organizationId, organizationId)))
    .returning();

  return updated;
}

export async function scheduleFieldServiceWorkOrder(
  organizationId: string,
  workOrderId: string,
  scheduledStart: string,
  scheduledEnd: string
) {
  const [existing] = await db
    .select({
      id: fieldServiceWorkOrders.id,
      status: fieldServiceWorkOrders.status,
    })
    .from(fieldServiceWorkOrders)
    .where(and(eq(fieldServiceWorkOrders.id, workOrderId), eq(fieldServiceWorkOrders.organizationId, organizationId)))
    .limit(1);

  if (!existing) {
    throw new AppError('Opération introuvable', 404, 'WORK_ORDER_NOT_FOUND');
  }

  if (existing.status === 'completed' || existing.status === 'cancelled') {
    throw new AppError('Impossible de planifier une opération terminée ou annulée', 400, 'WORK_ORDER_TERMINAL');
  }

  const nextStatus = existing.status === 'draft' ? 'scheduled' : existing.status;

  const [updated] = await db
    .update(fieldServiceWorkOrders)
    .set({
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: new Date(scheduledEnd),
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(and(eq(fieldServiceWorkOrders.id, workOrderId), eq(fieldServiceWorkOrders.organizationId, organizationId)))
    .returning();

  return updated;
}

export async function transitionFieldServiceWorkOrder(
  organizationId: string,
  workOrderId: string,
  toStatus: 'draft' | 'scheduled' | 'in_progress' | 'paused' | 'completed' | 'cancelled',
  cancellationReasonCode?: 'customer_request' | 'unavailable' | 'duplicate' | 'quote_not_accepted' | 'scheduling_issue' | 'technical_impossibility' | 'other' | null,
  cancellationNotes?: string | null
) {
  const [existing] = await db
    .select({
      id: fieldServiceWorkOrders.id,
      status: fieldServiceWorkOrders.status,
    })
    .from(fieldServiceWorkOrders)
    .where(and(eq(fieldServiceWorkOrders.id, workOrderId), eq(fieldServiceWorkOrders.organizationId, organizationId)))
    .limit(1);

  if (!existing) {
    throw new AppError('Opération introuvable', 404, 'WORK_ORDER_NOT_FOUND');
  }

  const updateValues: Partial<typeof fieldServiceWorkOrders.$inferInsert> = {
    status: toStatus,
    updatedAt: new Date(),
  };

  if (toStatus === 'cancelled') {
    if (!cancellationReasonCode) {
      throw new AppError('Motif d’annulation requis', 400, 'CANCELLATION_REASON_REQUIRED');
    }
    updateValues.cancellationReasonCode = cancellationReasonCode;
    updateValues.cancellationNotes = cancellationNotes ? cancellationNotes.trim() : null;
  } else {
    updateValues.cancellationReasonCode = null;
    updateValues.cancellationNotes = null;
  }

  const [updated] = await db
    .update(fieldServiceWorkOrders)
    .set(updateValues)
    .where(and(eq(fieldServiceWorkOrders.id, workOrderId), eq(fieldServiceWorkOrders.organizationId, organizationId)))
    .returning();

  return updated;
}

export async function getFieldServiceWorkOrderById(
  organizationId: string,
  workOrderId: string
) {
  const [order] = await db
    .select({
      id: fieldServiceWorkOrders.id,
      organizationId: fieldServiceWorkOrders.organizationId,
      clientId: fieldServiceWorkOrders.clientId,
      siteId: fieldServiceWorkOrders.siteId,
      createdByUserId: fieldServiceWorkOrders.createdByUserId,
      reference: fieldServiceWorkOrders.reference,
      title: fieldServiceWorkOrders.title,
      description: fieldServiceWorkOrders.description,
      workType: fieldServiceWorkOrders.workType,
      status: fieldServiceWorkOrders.status,
      priority: fieldServiceWorkOrders.priority,
      scheduledStart: fieldServiceWorkOrders.scheduledStart,
      scheduledEnd: fieldServiceWorkOrders.scheduledEnd,
      actualStart: fieldServiceWorkOrders.actualStart,
      actualEnd: fieldServiceWorkOrders.actualEnd,
      cancellationReasonCode: fieldServiceWorkOrders.cancellationReasonCode,
      cancellationNotes: fieldServiceWorkOrders.cancellationNotes,
      createdAt: fieldServiceWorkOrders.createdAt,
      updatedAt: fieldServiceWorkOrders.updatedAt,
      clientName: clients.name,
      clientEmail: clients.email,
      clientPhone: clients.phone,
      siteLabel: fieldServiceSites.label,
      siteAddressLine1: fieldServiceSites.addressLine1,
      siteAddressLine2: fieldServiceSites.addressLine2,
      sitePostalCode: fieldServiceSites.postalCode,
      siteCity: fieldServiceSites.city,
      siteAccessInstructions: fieldServiceSites.accessInstructions,
    })
    .from(fieldServiceWorkOrders)
    .leftJoin(clients, eq(clients.id, fieldServiceWorkOrders.clientId))
    .leftJoin(fieldServiceSites, eq(fieldServiceSites.id, fieldServiceWorkOrders.siteId))
    .where(and(eq(fieldServiceWorkOrders.id, workOrderId), eq(fieldServiceWorkOrders.organizationId, organizationId)))
    .limit(1);

  if (!order) {
    return null;
  }

  // Fetch active and past assignments
  const assignments = await db
    .select({
      id: fieldServiceWorkOrderAssignments.id,
      userId: fieldServiceWorkOrderAssignments.userId,
      role: fieldServiceWorkOrderAssignments.role,
      isActive: fieldServiceWorkOrderAssignments.isActive,
      assignedAt: fieldServiceWorkOrderAssignments.assignedAt,
      removedAt: fieldServiceWorkOrderAssignments.removedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(fieldServiceWorkOrderAssignments)
    .leftJoin(users, eq(users.id, fieldServiceWorkOrderAssignments.userId))
    .where(
      and(
        eq(fieldServiceWorkOrderAssignments.workOrderId, workOrderId),
        eq(fieldServiceWorkOrderAssignments.organizationId, organizationId)
      )
    )
    .orderBy(desc(fieldServiceWorkOrderAssignments.isActive), asc(fieldServiceWorkOrderAssignments.assignedAt));

  // Fetch reports
  const reports = await db
    .select({
      id: fieldServiceWorkReports.id,
      authorUserId: fieldServiceWorkReports.authorUserId,
      status: fieldServiceWorkReports.status,
      summary: fieldServiceWorkReports.summary,
      workPerformed: fieldServiceWorkReports.workPerformed,
      issuesFound: fieldServiceWorkReports.issuesFound,
      recommendations: fieldServiceWorkReports.recommendations,
      customerNotes: fieldServiceWorkReports.customerNotes,
      finalizedAt: fieldServiceWorkReports.finalizedAt,
      createdAt: fieldServiceWorkReports.createdAt,
      updatedAt: fieldServiceWorkReports.updatedAt,
      authorName: users.name,
    })
    .from(fieldServiceWorkReports)
    .leftJoin(users, eq(users.id, fieldServiceWorkReports.authorUserId))
    .where(
      and(
        eq(fieldServiceWorkReports.workOrderId, workOrderId),
        eq(fieldServiceWorkReports.organizationId, organizationId)
      )
    )
    .orderBy(desc(fieldServiceWorkReports.createdAt));

  // Fetch status history (timeline)
  const history = await db
    .select({
      id: fieldServiceWorkOrderStatusHistory.id,
      fromStatus: fieldServiceWorkOrderStatusHistory.fromStatus,
      toStatus: fieldServiceWorkOrderStatusHistory.toStatus,
      changedByUserId: fieldServiceWorkOrderStatusHistory.changedByUserId,
      reason: fieldServiceWorkOrderStatusHistory.reason,
      createdAt: fieldServiceWorkOrderStatusHistory.createdAt,
      changedByName: users.name,
    })
    .from(fieldServiceWorkOrderStatusHistory)
    .leftJoin(users, eq(users.id, fieldServiceWorkOrderStatusHistory.changedByUserId))
    .where(
      and(
        eq(fieldServiceWorkOrderStatusHistory.workOrderId, workOrderId),
        eq(fieldServiceWorkOrderStatusHistory.organizationId, organizationId)
      )
    )
    .orderBy(asc(fieldServiceWorkOrderStatusHistory.createdAt));

  return {
    ...order,
    assignments,
    reports,
    history,
  };
}

export async function listFieldServiceWorkOrders(
  organizationId: string,
  options?: {
    status?: 'draft' | 'scheduled' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    clientId?: string;
    search?: string;
    scheduledFrom?: string;
    scheduledTo?: string;
    limit?: number;
    offset?: number;
  }
) {
  const conditions = [eq(fieldServiceWorkOrders.organizationId, organizationId)];

  if (options?.status) {
    conditions.push(eq(fieldServiceWorkOrders.status, options.status));
  }
  if (options?.priority) {
    conditions.push(eq(fieldServiceWorkOrders.priority, options.priority));
  }
  if (options?.clientId) {
    conditions.push(eq(fieldServiceWorkOrders.clientId, options.clientId));
  }
  if (options?.scheduledFrom) {
    conditions.push(gte(fieldServiceWorkOrders.scheduledStart, new Date(options.scheduledFrom)));
  }
  if (options?.scheduledTo) {
    conditions.push(lte(fieldServiceWorkOrders.scheduledStart, new Date(options.scheduledTo)));
  }
  if (options?.search) {
    const q = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(fieldServiceWorkOrders.reference, q),
        ilike(fieldServiceWorkOrders.title, q),
        ilike(clients.name, q)
      )!
    );
  }

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const rows = await db
    .select({
      id: fieldServiceWorkOrders.id,
      organizationId: fieldServiceWorkOrders.organizationId,
      clientId: fieldServiceWorkOrders.clientId,
      siteId: fieldServiceWorkOrders.siteId,
      reference: fieldServiceWorkOrders.reference,
      title: fieldServiceWorkOrders.title,
      workType: fieldServiceWorkOrders.workType,
      status: fieldServiceWorkOrders.status,
      priority: fieldServiceWorkOrders.priority,
      scheduledStart: fieldServiceWorkOrders.scheduledStart,
      scheduledEnd: fieldServiceWorkOrders.scheduledEnd,
      actualStart: fieldServiceWorkOrders.actualStart,
      actualEnd: fieldServiceWorkOrders.actualEnd,
      createdAt: fieldServiceWorkOrders.createdAt,
      updatedAt: fieldServiceWorkOrders.updatedAt,
      clientName: clients.name,
      siteLabel: fieldServiceSites.label,
      siteCity: fieldServiceSites.city,
    })
    .from(fieldServiceWorkOrders)
    .leftJoin(clients, eq(clients.id, fieldServiceWorkOrders.clientId))
    .leftJoin(fieldServiceSites, eq(fieldServiceSites.id, fieldServiceWorkOrders.siteId))
    .where(and(...conditions))
    .orderBy(desc(fieldServiceWorkOrders.createdAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

// ============================================================================
// Assignment Operations
// ============================================================================

export async function assignFieldServiceWorker(
  organizationId: string,
  workOrderId: string,
  userId: string,
  role: 'lead' | 'technician' | 'assistant' | 'observer'
) {
  // 1. Verify work order belongs to organization and not terminal
  const [order] = await db
    .select({ id: fieldServiceWorkOrders.id, status: fieldServiceWorkOrders.status })
    .from(fieldServiceWorkOrders)
    .where(and(eq(fieldServiceWorkOrders.id, workOrderId), eq(fieldServiceWorkOrders.organizationId, organizationId)))
    .limit(1);

  if (!order) {
    throw new AppError('Opération introuvable', 404, 'WORK_ORDER_NOT_FOUND');
  }

  if (order.status === 'completed' || order.status === 'cancelled') {
    throw new AppError('Impossible d’assigner un technicien à une opération terminée ou annulée', 400, 'WORK_ORDER_TERMINAL');
  }

  // 2. Verify user belongs to organization and is professional
  const [user] = await db
    .select({ id: users.id, profileType: users.profileType })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
    .limit(1);

  if (!user || user.profileType !== 'professional') {
    throw new AppError('L’utilisateur assigné doit être un professionnel actif de l’organisation', 400, 'INVALID_ASSIGNED_USER');
  }

  const assignmentId = crypto.randomUUID();

  const [assignment] = await db
    .insert(fieldServiceWorkOrderAssignments)
    .values({
      id: assignmentId,
      organizationId,
      workOrderId,
      userId,
      role,
      isActive: true,
      assignedAt: new Date(),
    })
    .returning();

  return assignment;
}

export async function unassignFieldServiceWorker(
  organizationId: string,
  assignmentId: string
) {
  const [existing] = await db
    .select({ id: fieldServiceWorkOrderAssignments.id, isActive: fieldServiceWorkOrderAssignments.isActive })
    .from(fieldServiceWorkOrderAssignments)
    .where(
      and(
        eq(fieldServiceWorkOrderAssignments.id, assignmentId),
        eq(fieldServiceWorkOrderAssignments.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new AppError('Assignation introuvable', 404, 'ASSIGNMENT_NOT_FOUND');
  }

  const [updated] = await db
    .update(fieldServiceWorkOrderAssignments)
    .set({
      isActive: false,
      removedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(fieldServiceWorkOrderAssignments.id, assignmentId),
        eq(fieldServiceWorkOrderAssignments.organizationId, organizationId)
      )
    )
    .returning();

  return updated;
}

// ============================================================================
// Work Report Operations
// ============================================================================

export async function createFieldServiceWorkReport(
  organizationId: string,
  authorUserId: string,
  data: {
    workOrderId: string;
    summary: string;
    workPerformed?: string | null;
    issuesFound?: string | null;
    recommendations?: string | null;
    customerNotes?: string | null;
  }
) {
  const [order] = await db
    .select({ id: fieldServiceWorkOrders.id })
    .from(fieldServiceWorkOrders)
    .where(and(eq(fieldServiceWorkOrders.id, data.workOrderId), eq(fieldServiceWorkOrders.organizationId, organizationId)))
    .limit(1);

  if (!order) {
    throw new AppError('Opération introuvable', 404, 'WORK_ORDER_NOT_FOUND');
  }

  const reportId = crypto.randomUUID();

  const [report] = await db
    .insert(fieldServiceWorkReports)
    .values({
      id: reportId,
      organizationId,
      workOrderId: data.workOrderId,
      authorUserId,
      status: 'draft',
      summary: data.summary.trim(),
      workPerformed: data.workPerformed ? data.workPerformed.trim() : null,
      issuesFound: data.issuesFound ? data.issuesFound.trim() : null,
      recommendations: data.recommendations ? data.recommendations.trim() : null,
      customerNotes: data.customerNotes ? data.customerNotes.trim() : null,
    })
    .returning();

  return report;
}

export async function updateFieldServiceWorkReport(
  organizationId: string,
  reportId: string,
  data: {
    summary?: string;
    workPerformed?: string | null;
    issuesFound?: string | null;
    recommendations?: string | null;
    customerNotes?: string | null;
  }
) {
  const [existing] = await db
    .select({ id: fieldServiceWorkReports.id, status: fieldServiceWorkReports.status })
    .from(fieldServiceWorkReports)
    .where(and(eq(fieldServiceWorkReports.id, reportId), eq(fieldServiceWorkReports.organizationId, organizationId)))
    .limit(1);

  if (!existing) {
    throw new AppError('Rapport introuvable', 404, 'REPORT_NOT_FOUND');
  }

  if (existing.status === 'finalized') {
    throw new AppError('Impossible de modifier un rapport finalisé', 400, 'REPORT_FINALIZED_IMMUTABLE');
  }

  const updateValues: Partial<typeof fieldServiceWorkReports.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.summary !== undefined) updateValues.summary = data.summary.trim();
  if (data.workPerformed !== undefined) updateValues.workPerformed = data.workPerformed ? data.workPerformed.trim() : null;
  if (data.issuesFound !== undefined) updateValues.issuesFound = data.issuesFound ? data.issuesFound.trim() : null;
  if (data.recommendations !== undefined) updateValues.recommendations = data.recommendations ? data.recommendations.trim() : null;
  if (data.customerNotes !== undefined) updateValues.customerNotes = data.customerNotes ? data.customerNotes.trim() : null;

  const [updated] = await db
    .update(fieldServiceWorkReports)
    .set(updateValues)
    .where(and(eq(fieldServiceWorkReports.id, reportId), eq(fieldServiceWorkReports.organizationId, organizationId)))
    .returning();

  return updated;
}

export async function finalizeFieldServiceWorkReport(
  organizationId: string,
  reportId: string
) {
  const [existing] = await db
    .select({ id: fieldServiceWorkReports.id, status: fieldServiceWorkReports.status })
    .from(fieldServiceWorkReports)
    .where(and(eq(fieldServiceWorkReports.id, reportId), eq(fieldServiceWorkReports.organizationId, organizationId)))
    .limit(1);

  if (!existing) {
    throw new AppError('Rapport introuvable', 404, 'REPORT_NOT_FOUND');
  }

  if (existing.status === 'finalized') {
    throw new AppError('Ce rapport est déjà finalisé', 400, 'REPORT_ALREADY_FINALIZED');
  }

  const [finalized] = await db
    .update(fieldServiceWorkReports)
    .set({
      status: 'finalized',
      finalizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(fieldServiceWorkReports.id, reportId), eq(fieldServiceWorkReports.organizationId, organizationId)))
    .returning();

  return finalized;
}

// ============================================================================
// Dashboard Operations Metrics
// ============================================================================

export async function getFieldServiceDashboardMetrics(organizationId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      draft: sql<number>`count(*) filter (where ${fieldServiceWorkOrders.status} = 'draft')::int`,
      scheduled: sql<number>`count(*) filter (where ${fieldServiceWorkOrders.status} = 'scheduled')::int`,
      inProgress: sql<number>`count(*) filter (where ${fieldServiceWorkOrders.status} = 'in_progress')::int`,
      paused: sql<number>`count(*) filter (where ${fieldServiceWorkOrders.status} = 'paused')::int`,
      completed: sql<number>`count(*) filter (where ${fieldServiceWorkOrders.status} = 'completed')::int`,
      cancelled: sql<number>`count(*) filter (where ${fieldServiceWorkOrders.status} = 'cancelled')::int`,
      todayOperations: sql<number>`count(*) filter (
        where ${fieldServiceWorkOrders.scheduledStart} >= ${todayStart.toISOString()} 
          and ${fieldServiceWorkOrders.scheduledStart} <= ${todayEnd.toISOString()}
      )::int`,
      overdueOperations: sql<number>`count(*) filter (
        where ${fieldServiceWorkOrders.status} in ('scheduled', 'in_progress')
          and ${fieldServiceWorkOrders.scheduledEnd} < now()
      )::int`,
    })
    .from(fieldServiceWorkOrders)
    .where(eq(fieldServiceWorkOrders.organizationId, organizationId));

  return {
    total: counts?.total ?? 0,
    draft: counts?.draft ?? 0,
    scheduled: counts?.scheduled ?? 0,
    inProgress: counts?.inProgress ?? 0,
    paused: counts?.paused ?? 0,
    completed: counts?.completed ?? 0,
    cancelled: counts?.cancelled ?? 0,
    todayOperations: counts?.todayOperations ?? 0,
    overdueOperations: counts?.overdueOperations ?? 0,
  };
}
