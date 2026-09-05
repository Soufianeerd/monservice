import { db } from '@/lib/db/server';
import {
  appointmentTypes,
  practitionerAvailabilityRules,
  practitionerAvailabilityExceptions,
  appointments,
  appointmentWaitlistEntries,
  patientProfiles,
  practicePractitioners,
  practiceLocations,
  practitionerLocations,
  practiceRooms,
  users,
} from '@/lib/db/schema';
import { eq, and, sql, desc, asc, ilike, or, gte, lte, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { AppError } from '@/lib/errors';
import {
  AppointmentTypeDTO,
  AvailabilityRuleDTO,
  AvailabilityExceptionDTO,
  AppointmentDTO,
  AppointmentCalendarEventDTO,
  AppointmentStatus,
  AppointmentCancellationReasonCode,
  WaitlistStatus,
  WaitlistResolutionCode,
  WaitlistEntryDTO,
  WaitlistFilters,
  WaitlistMatchDTO,
  SchedulingBootstrapDTO,
  SchedulingPractitionerDTO,
  SchedulingPatientOptionDTO,
} from '@/lib/scheduling/types';
import {
  appointmentTypeCreateSchema,
  appointmentTypeUpdateSchema,
  availabilityRuleCreateSchema,
  availabilityRuleUpdateSchema,
  availabilityExceptionCreateSchema,
  availabilityExceptionUpdateSchema,
  appointmentCreateSchema,
  appointmentRescheduleSchema,
  appointmentCalendarRangeSchema,
  appointmentCancelSchema,
  appointmentNoShowSchema,
  waitlistCreateSchema,
  waitlistUpdateSchema,
  waitlistResolveSchema,
  patientSearchSchema,
} from '@/lib/scheduling/validation';
import {
  computeEffectiveAvailability,
  isSlotAvailable,
  isOvernight,
  verifyTimezoneRoundTrip,
  formatUtcToLocal,
  doAvailabilityRulesOverlap,
} from '@/lib/scheduling/availability';
import { z } from 'zod';

export type AppointmentTypeCreateInput = z.infer<typeof appointmentTypeCreateSchema>;
export type AppointmentTypeUpdateInput = z.infer<typeof appointmentTypeUpdateSchema>;
export type AvailabilityRuleCreateInput = z.infer<typeof availabilityRuleCreateSchema>;
export type AvailabilityRuleUpdateInput = z.infer<typeof availabilityRuleUpdateSchema>;
export type AvailabilityExceptionCreateInput = z.infer<typeof availabilityExceptionCreateSchema>;
export type AvailabilityExceptionUpdateInput = z.infer<typeof availabilityExceptionUpdateSchema>;
export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;
export type AppointmentRescheduleInput = z.infer<typeof appointmentRescheduleSchema>;
export type AppointmentCancelInput = z.infer<typeof appointmentCancelSchema>;
export type AppointmentNoShowInput = z.infer<typeof appointmentNoShowSchema>;
export type WaitlistCreateInput = z.infer<typeof waitlistCreateSchema>;
export type WaitlistUpdateInput = z.infer<typeof waitlistUpdateSchema>;
export type WaitlistResolveInput = z.infer<typeof waitlistResolveSchema>;

interface PostgresErrorLike {
  code?: string;
  sqlState?: string;
  message?: string;
  cause?: {
    code?: string;
    sqlState?: string;
    message?: string;
  };
}

function isPostgresErrorLike(err: unknown): err is PostgresErrorLike {
  return typeof err === 'object' && err !== null;
}

function toAvailabilityKind(kind: string): 'open' | 'closed' {
  return kind === 'open' ? 'open' : 'closed';
}

function toAppointmentStatus(status: string): AppointmentStatus {
  if (status === 'scheduled' || status === 'cancelled' || status === 'no_show') {
    return status;
  }
  throw new AppError(`Statut de séance inconnu: ${status}`, 500);
}

function toCancellationReasonCode(code: string | null): AppointmentCancellationReasonCode | null {
  if (!code) return null;
  if (
    code === 'patient_request' ||
    code === 'practitioner_request' ||
    code === 'practice_unavailable' ||
    code === 'scheduling_error' ||
    code === 'duplicate' ||
    code === 'other'
  ) {
    return code;
  }
  throw new AppError(`Motif d'annulation inconnu: ${code}`, 500);
}

function toWaitlistStatus(status: string): WaitlistStatus {
  if (status === 'waiting' || status === 'resolved') {
    return status;
  }
  throw new AppError(`Statut de liste d'attente inconnu: ${status}`, 500);
}

function toWaitlistResolutionCode(code: string | null): WaitlistResolutionCode | null {
  if (!code) return null;
  if (code === 'booked' || code === 'withdrawn' || code === 'not_needed' || code === 'other') {
    return code;
  }
  throw new AppError(`Code de résolution de liste d'attente inconnu: ${code}`, 500);
}

export function isPgConflictError(error: unknown): boolean {
  if (isPostgresErrorLike(error)) {
    if (error.code === '23P01' || error.sqlState === '23P01') return true;
    if (typeof error.message === 'string' && error.message.includes('23P01')) return true;
    if (error.cause && typeof error.cause === 'object') {
      if (error.cause.code === '23P01' || error.cause.sqlState === '23P01') return true;
      if (typeof error.cause.message === 'string' && error.cause.message.includes('23P01')) return true;
    }
  }
  return false;
}

export const schedulingService = {
  // ==========================================
  // APPOINTMENT TYPES
  // ==========================================
  async listAppointmentTypes(organizationId: string): Promise<AppointmentTypeDTO[]> {
    const rows = await db
      .select()
      .from(appointmentTypes)
      .where(eq(appointmentTypes.organizationId, organizationId))
      .orderBy(desc(appointmentTypes.isActive), asc(appointmentTypes.name));

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      name: r.name,
      description: r.description,
      durationMinutes: r.durationMinutes,
      bufferBeforeMinutes: r.bufferBeforeMinutes,
      bufferAfterMinutes: r.bufferAfterMinutes,
      slotStepMinutes: r.slotStepMinutes,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  },

  async createAppointmentType(
    organizationId: string,
    data: AppointmentTypeCreateInput
  ): Promise<AppointmentTypeDTO> {
    const validated = appointmentTypeCreateSchema.parse(data);

    // Check unique name per tenant
    const existing = await db
      .select({ id: appointmentTypes.id })
      .from(appointmentTypes)
      .where(
        and(
          eq(appointmentTypes.organizationId, organizationId),
          eq(appointmentTypes.name, validated.name.trim())
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new AppError('Un type de séance porte déjà ce nom', 400, 'DUPLICATE_NAME');
    }

    const id = randomUUID();
    const [created] = await db
      .insert(appointmentTypes)
      .values({
        id,
        organizationId,
        name: validated.name.trim(),
        description: validated.description?.trim() || null,
        durationMinutes: validated.durationMinutes,
        bufferBeforeMinutes: validated.bufferBeforeMinutes,
        bufferAfterMinutes: validated.bufferAfterMinutes,
        slotStepMinutes: validated.slotStepMinutes,
        isActive: true,
      })
      .returning();

    if (!created) {
      throw new AppError('Échec de la création du type de séance', 500);
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      name: created.name,
      description: created.description,
      durationMinutes: created.durationMinutes,
      bufferBeforeMinutes: created.bufferBeforeMinutes,
      bufferAfterMinutes: created.bufferAfterMinutes,
      slotStepMinutes: created.slotStepMinutes,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  },

  async updateAppointmentType(
    organizationId: string,
    data: AppointmentTypeUpdateInput
  ): Promise<AppointmentTypeDTO> {
    const validated = appointmentTypeUpdateSchema.parse(data);

    const existing = await db
      .select()
      .from(appointmentTypes)
      .where(
        and(
          eq(appointmentTypes.id, validated.id),
          eq(appointmentTypes.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0 || !existing[0]) {
      throw new AppError('Type de séance non trouvé', 404, 'NOT_FOUND');
    }

    // Check name uniqueness if name changed
    if (validated.name.trim() !== existing[0].name) {
      const duplicate = await db
        .select({ id: appointmentTypes.id })
        .from(appointmentTypes)
        .where(
          and(
            eq(appointmentTypes.organizationId, organizationId),
            eq(appointmentTypes.name, validated.name.trim())
          )
        )
        .limit(1);

      if (duplicate.length > 0) {
        throw new AppError('Un type de séance porte déjà ce nom', 400, 'DUPLICATE_NAME');
      }
    }

    const [updated] = await db
      .update(appointmentTypes)
      .set({
        name: validated.name.trim(),
        description: validated.description?.trim() || null,
        durationMinutes: validated.durationMinutes,
        bufferBeforeMinutes: validated.bufferBeforeMinutes,
        bufferAfterMinutes: validated.bufferAfterMinutes,
        slotStepMinutes: validated.slotStepMinutes,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(appointmentTypes.id, validated.id),
          eq(appointmentTypes.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new AppError('Échec de la mise à jour du type de séance', 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      description: updated.description,
      durationMinutes: updated.durationMinutes,
      bufferBeforeMinutes: updated.bufferBeforeMinutes,
      bufferAfterMinutes: updated.bufferAfterMinutes,
      slotStepMinutes: updated.slotStepMinutes,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async setAppointmentTypeActive(
    organizationId: string,
    id: string,
    isActive: boolean
  ): Promise<AppointmentTypeDTO> {
    const existing = await db
      .select()
      .from(appointmentTypes)
      .where(
        and(
          eq(appointmentTypes.id, id),
          eq(appointmentTypes.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0 || !existing[0]) {
      throw new AppError('Type de séance non trouvé', 404, 'NOT_FOUND');
    }

    const [updated] = await db
      .update(appointmentTypes)
      .set({
        isActive,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(appointmentTypes.id, id),
          eq(appointmentTypes.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new AppError('Échec du changement de statut du type de séance', 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      description: updated.description,
      durationMinutes: updated.durationMinutes,
      bufferBeforeMinutes: updated.bufferBeforeMinutes,
      bufferAfterMinutes: updated.bufferAfterMinutes,
      slotStepMinutes: updated.slotStepMinutes,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  // ==========================================
  // PRACTITIONER AVAILABILITY RULES
  // ==========================================
  async listAvailabilityRules(
    organizationId: string,
    practitionerId?: string,
    locationId?: string
  ): Promise<AvailabilityRuleDTO[]> {
    const conditions = [eq(practitionerAvailabilityRules.organizationId, organizationId)];

    if (practitionerId) {
      conditions.push(eq(practitionerAvailabilityRules.practitionerId, practitionerId));
    }
    if (locationId) {
      conditions.push(eq(practitionerAvailabilityRules.locationId, locationId));
    }

    const rows = await db
      .select()
      .from(practitionerAvailabilityRules)
      .where(and(...conditions))
      .orderBy(
        asc(practitionerAvailabilityRules.weekday),
        asc(practitionerAvailabilityRules.startTime)
      );

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      practitionerId: r.practitionerId,
      locationId: r.locationId,
      weekday: r.weekday,
      startTime: r.startTime,
      endTime: r.endTime,
      validFrom: r.validFrom,
      validUntil: r.validUntil,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  },

  async createAvailabilityRule(
    organizationId: string,
    data: AvailabilityRuleCreateInput
  ): Promise<AvailabilityRuleDTO> {
    const validated = availabilityRuleCreateSchema.parse(data);

    // Verify practitioner-location assignment exists and is active
    const assignment = await db
      .select()
      .from(practitionerLocations)
      .where(
        and(
          eq(practitionerLocations.organizationId, organizationId),
          eq(practitionerLocations.practitionerId, validated.practitionerId),
          eq(practitionerLocations.locationId, validated.locationId),
          eq(practitionerLocations.isActive, true)
        )
      )
      .limit(1);

    if (assignment.length === 0) {
      throw new AppError(
        "Le praticien n'est pas affecté à ce lieu ou l'affectation est inactive",
        400,
        'INVALID_PRACTITIONER_LOCATION'
      );
    }

    // Check overlapping active rules
    const existingRules = await db
      .select()
      .from(practitionerAvailabilityRules)
      .where(
        and(
          eq(practitionerAvailabilityRules.organizationId, organizationId),
          eq(practitionerAvailabilityRules.practitionerId, validated.practitionerId),
          eq(practitionerAvailabilityRules.locationId, validated.locationId),
          eq(practitionerAvailabilityRules.weekday, validated.weekday),
          eq(practitionerAvailabilityRules.isActive, true)
        )
      );

    for (const rule of existingRules) {
      const overlaps = doAvailabilityRulesOverlap(
        {
          practitionerId: validated.practitionerId,
          locationId: validated.locationId,
          weekday: validated.weekday,
          startTime: validated.startTime,
          endTime: validated.endTime,
          validFrom: validated.validFrom,
          validUntil: validated.validUntil,
        },
        {
          practitionerId: rule.practitionerId,
          locationId: rule.locationId,
          weekday: rule.weekday,
          startTime: rule.startTime,
          endTime: rule.endTime,
          validFrom: rule.validFrom,
          validUntil: rule.validUntil,
        }
      );

      if (overlaps) {
        throw new AppError(
          'Une règle de disponibilité active chevauche déjà ce créneau horaire et cette période de validité',
          400,
          'AVAILABILITY_RULE_OVERLAP'
        );
      }
    }

    const id = randomUUID();
    const [created] = await db
      .insert(practitionerAvailabilityRules)
      .values({
        id,
        organizationId,
        practitionerId: validated.practitionerId,
        locationId: validated.locationId,
        weekday: validated.weekday,
        startTime: validated.startTime,
        endTime: validated.endTime,
        validFrom: validated.validFrom,
        validUntil: validated.validUntil || null,
        isActive: true,
      })
      .returning();

    if (!created) {
      throw new AppError('Échec de la création de la règle de disponibilité', 500);
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      practitionerId: created.practitionerId,
      locationId: created.locationId,
      weekday: created.weekday,
      startTime: created.startTime,
      endTime: created.endTime,
      validFrom: created.validFrom,
      validUntil: created.validUntil,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  },

  async updateAvailabilityRule(
    organizationId: string,
    data: AvailabilityRuleUpdateInput
  ): Promise<AvailabilityRuleDTO> {
    const validated = availabilityRuleUpdateSchema.parse(data);

    const existing = await db
      .select()
      .from(practitionerAvailabilityRules)
      .where(
        and(
          eq(practitionerAvailabilityRules.id, validated.id),
          eq(practitionerAvailabilityRules.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0 || !existing[0]) {
      throw new AppError('Règle de disponibilité non trouvée', 404, 'NOT_FOUND');
    }

    // Verify practitioner-location assignment exists and is active
    const assignment = await db
      .select()
      .from(practitionerLocations)
      .where(
        and(
          eq(practitionerLocations.organizationId, organizationId),
          eq(practitionerLocations.practitionerId, validated.practitionerId),
          eq(practitionerLocations.locationId, validated.locationId),
          eq(practitionerLocations.isActive, true)
        )
      )
      .limit(1);

    if (assignment.length === 0) {
      throw new AppError(
        "Le praticien n'est pas affecté à ce lieu ou l'affectation est inactive",
        400,
        'INVALID_PRACTITIONER_LOCATION'
      );
    }

    // Check overlapping active rules excluding current rule
    const existingRules = await db
      .select()
      .from(practitionerAvailabilityRules)
      .where(
        and(
          eq(practitionerAvailabilityRules.organizationId, organizationId),
          eq(practitionerAvailabilityRules.practitionerId, validated.practitionerId),
          eq(practitionerAvailabilityRules.locationId, validated.locationId),
          eq(practitionerAvailabilityRules.weekday, validated.weekday),
          eq(practitionerAvailabilityRules.isActive, true)
        )
      );

    for (const rule of existingRules) {
      if (rule.id === validated.id) continue;
      const overlaps = doAvailabilityRulesOverlap(
        {
          practitionerId: validated.practitionerId,
          locationId: validated.locationId,
          weekday: validated.weekday,
          startTime: validated.startTime,
          endTime: validated.endTime,
          validFrom: validated.validFrom,
          validUntil: validated.validUntil,
        },
        {
          practitionerId: rule.practitionerId,
          locationId: rule.locationId,
          weekday: rule.weekday,
          startTime: rule.startTime,
          endTime: rule.endTime,
          validFrom: rule.validFrom,
          validUntil: rule.validUntil,
        }
      );

      if (overlaps) {
        throw new AppError(
          'Une règle de disponibilité active chevauche déjà ce créneau horaire et cette période de validité',
          400,
          'AVAILABILITY_RULE_OVERLAP'
        );
      }
    }

    const [updated] = await db
      .update(practitionerAvailabilityRules)
      .set({
        practitionerId: validated.practitionerId,
        locationId: validated.locationId,
        weekday: validated.weekday,
        startTime: validated.startTime,
        endTime: validated.endTime,
        validFrom: validated.validFrom,
        validUntil: validated.validUntil || null,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(practitionerAvailabilityRules.id, validated.id),
          eq(practitionerAvailabilityRules.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new AppError('Échec de la mise à jour de la règle de disponibilité', 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      practitionerId: updated.practitionerId,
      locationId: updated.locationId,
      weekday: updated.weekday,
      startTime: updated.startTime,
      endTime: updated.endTime,
      validFrom: updated.validFrom,
      validUntil: updated.validUntil,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async setAvailabilityRuleActive(
    organizationId: string,
    id: string,
    isActive: boolean
  ): Promise<AvailabilityRuleDTO> {
    const existing = await db
      .select()
      .from(practitionerAvailabilityRules)
      .where(
        and(
          eq(practitionerAvailabilityRules.id, id),
          eq(practitionerAvailabilityRules.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0 || !existing[0]) {
      throw new AppError('Règle de disponibilité non trouvée', 404, 'NOT_FOUND');
    }

    const ruleToUpdate = existing[0];

    // If activating, verify that it doesn't overlap with another active rule
    if (isActive) {
      const activeRules = await db
        .select()
        .from(practitionerAvailabilityRules)
        .where(
          and(
            eq(practitionerAvailabilityRules.organizationId, organizationId),
            eq(practitionerAvailabilityRules.practitionerId, ruleToUpdate.practitionerId),
            eq(practitionerAvailabilityRules.locationId, ruleToUpdate.locationId),
            eq(practitionerAvailabilityRules.weekday, ruleToUpdate.weekday),
            eq(practitionerAvailabilityRules.isActive, true)
          )
        );

      for (const rule of activeRules) {
        if (rule.id === id) continue;
        const overlaps = doAvailabilityRulesOverlap(
          {
            practitionerId: ruleToUpdate.practitionerId,
            locationId: ruleToUpdate.locationId,
            weekday: ruleToUpdate.weekday,
            startTime: ruleToUpdate.startTime,
            endTime: ruleToUpdate.endTime,
            validFrom: ruleToUpdate.validFrom,
            validUntil: ruleToUpdate.validUntil,
          },
          {
            practitionerId: rule.practitionerId,
            locationId: rule.locationId,
            weekday: rule.weekday,
            startTime: rule.startTime,
            endTime: rule.endTime,
            validFrom: rule.validFrom,
            validUntil: rule.validUntil,
          }
        );

        if (overlaps) {
          throw new AppError(
            'Impossible d’activer cette règle car elle chevauche une autre règle active',
            400,
            'AVAILABILITY_RULE_OVERLAP'
          );
        }
      }
    }

    const [updated] = await db
      .update(practitionerAvailabilityRules)
      .set({
        isActive,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(practitionerAvailabilityRules.id, id),
          eq(practitionerAvailabilityRules.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new AppError('Échec du changement de statut de la règle', 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      practitionerId: updated.practitionerId,
      locationId: updated.locationId,
      weekday: updated.weekday,
      startTime: updated.startTime,
      endTime: updated.endTime,
      validFrom: updated.validFrom,
      validUntil: updated.validUntil,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  // ==========================================
  // PRACTITIONER AVAILABILITY EXCEPTIONS
  // ==========================================
  async listAvailabilityExceptions(
    organizationId: string,
    practitionerId?: string,
    locationId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<AvailabilityExceptionDTO[]> {
    const conditions = [eq(practitionerAvailabilityExceptions.organizationId, organizationId)];

    if (practitionerId) {
      conditions.push(eq(practitionerAvailabilityExceptions.practitionerId, practitionerId));
    }
    if (locationId) {
      conditions.push(eq(practitionerAvailabilityExceptions.locationId, locationId));
    }
    if (startDate) {
      conditions.push(gte(practitionerAvailabilityExceptions.localDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(practitionerAvailabilityExceptions.localDate, endDate));
    }

    const rows = await db
      .select()
      .from(practitionerAvailabilityExceptions)
      .where(and(...conditions))
      .orderBy(
        asc(practitionerAvailabilityExceptions.localDate),
        asc(practitionerAvailabilityExceptions.startTime)
      );

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      practitionerId: r.practitionerId,
      locationId: r.locationId,
      localDate: r.localDate,
      kind: toAvailabilityKind(r.kind),
      startTime: r.startTime,
      endTime: r.endTime,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  },

  async createAvailabilityException(
    organizationId: string,
    data: AvailabilityExceptionCreateInput
  ): Promise<AvailabilityExceptionDTO> {
    const validated = availabilityExceptionCreateSchema.parse(data);

    // Verify practitioner-location assignment exists and is active
    const assignment = await db
      .select()
      .from(practitionerLocations)
      .where(
        and(
          eq(practitionerLocations.organizationId, organizationId),
          eq(practitionerLocations.practitionerId, validated.practitionerId),
          eq(practitionerLocations.locationId, validated.locationId),
          eq(practitionerLocations.isActive, true)
        )
      )
      .limit(1);

    if (assignment.length === 0) {
      throw new AppError(
        "Le praticien n'est pas affecté à ce lieu ou l'affectation est inactive",
        400,
        'INVALID_PRACTITIONER_LOCATION'
      );
    }

    const id = randomUUID();
    const [created] = await db
      .insert(practitionerAvailabilityExceptions)
      .values({
        id,
        organizationId,
        practitionerId: validated.practitionerId,
        locationId: validated.locationId,
        localDate: validated.localDate,
        kind: validated.kind,
        startTime: validated.startTime?.trim() || null,
        endTime: validated.endTime?.trim() || null,
        isActive: true,
      })
      .returning();

    if (!created) {
      throw new AppError("Échec de la création de l'exception de disponibilité", 500);
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      practitionerId: created.practitionerId,
      locationId: created.locationId,
      localDate: created.localDate,
      kind: toAvailabilityKind(created.kind),
      startTime: created.startTime,
      endTime: created.endTime,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  },

  async updateAvailabilityException(
    organizationId: string,
    data: AvailabilityExceptionUpdateInput
  ): Promise<AvailabilityExceptionDTO> {
    const validated = availabilityExceptionUpdateSchema.parse(data);

    const existing = await db
      .select()
      .from(practitionerAvailabilityExceptions)
      .where(
        and(
          eq(practitionerAvailabilityExceptions.id, validated.id),
          eq(practitionerAvailabilityExceptions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0 || !existing[0]) {
      throw new AppError('Exception de disponibilité non trouvée', 404, 'NOT_FOUND');
    }

    // Verify practitioner-location assignment exists and is active
    const assignment = await db
      .select()
      .from(practitionerLocations)
      .where(
        and(
          eq(practitionerLocations.organizationId, organizationId),
          eq(practitionerLocations.practitionerId, validated.practitionerId),
          eq(practitionerLocations.locationId, validated.locationId),
          eq(practitionerLocations.isActive, true)
        )
      )
      .limit(1);

    if (assignment.length === 0) {
      throw new AppError(
        "Le praticien n'est pas affecté à ce lieu ou l'affectation est inactive",
        400,
        'INVALID_PRACTITIONER_LOCATION'
      );
    }

    const [updated] = await db
      .update(practitionerAvailabilityExceptions)
      .set({
        practitionerId: validated.practitionerId,
        locationId: validated.locationId,
        localDate: validated.localDate,
        kind: validated.kind,
        startTime: validated.startTime?.trim() || null,
        endTime: validated.endTime?.trim() || null,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(practitionerAvailabilityExceptions.id, validated.id),
          eq(practitionerAvailabilityExceptions.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new AppError("Échec de la mise à jour de l'exception de disponibilité", 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      practitionerId: updated.practitionerId,
      locationId: updated.locationId,
      localDate: updated.localDate,
      kind: toAvailabilityKind(updated.kind),
      startTime: updated.startTime,
      endTime: updated.endTime,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async setAvailabilityExceptionActive(
    organizationId: string,
    id: string,
    isActive: boolean
  ): Promise<AvailabilityExceptionDTO> {
    const existing = await db
      .select()
      .from(practitionerAvailabilityExceptions)
      .where(
        and(
          eq(practitionerAvailabilityExceptions.id, id),
          eq(practitionerAvailabilityExceptions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0 || !existing[0]) {
      throw new AppError('Exception de disponibilité non trouvée', 404, 'NOT_FOUND');
    }

    const [updated] = await db
      .update(practitionerAvailabilityExceptions)
      .set({
        isActive,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(practitionerAvailabilityExceptions.id, id),
          eq(practitionerAvailabilityExceptions.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new AppError("Échec du changement de statut de l'exception", 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      practitionerId: updated.practitionerId,
      locationId: updated.locationId,
      localDate: updated.localDate,
      kind: toAvailabilityKind(updated.kind),
      startTime: updated.startTime,
      endTime: updated.endTime,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  // ==========================================
  // BOOTSTRAP & PATIENT SEARCH
  // ==========================================
  async getSchedulingBootstrap(organizationId: string): Promise<SchedulingBootstrapDTO> {
    // 1. Locations
    const locRows = await db
      .select({
        id: practiceLocations.id,
        name: practiceLocations.name,
        timezone: practiceLocations.timezone,
        isActive: practiceLocations.isActive,
      })
      .from(practiceLocations)
      .where(
        and(
          eq(practiceLocations.organizationId, organizationId),
          eq(practiceLocations.isActive, true)
        )
      )
      .orderBy(asc(practiceLocations.name));

    // 2. Practitioners + assigned location IDs
    const pracRows = await db
      .select({
        id: practicePractitioners.id,
        displayName: practicePractitioners.displayName,
        isActive: practicePractitioners.isActive,
      })
      .from(practicePractitioners)
      .where(
        and(
          eq(practicePractitioners.organizationId, organizationId),
          eq(practicePractitioners.isActive, true)
        )
      )
      .orderBy(asc(practicePractitioners.displayName));

    const assignRows = await db
      .select({
        practitionerId: practitionerLocations.practitionerId,
        locationId: practitionerLocations.locationId,
      })
      .from(practitionerLocations)
      .where(
        and(
          eq(practitionerLocations.organizationId, organizationId),
          eq(practitionerLocations.isActive, true)
        )
      );

    const pracAssignmentsMap = new Map<string, string[]>();
    for (const a of assignRows) {
      const list = pracAssignmentsMap.get(a.practitionerId) || [];
      list.push(a.locationId);
      pracAssignmentsMap.set(a.practitionerId, list);
    }

    const practitioners: SchedulingPractitionerDTO[] = pracRows.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      isActive: p.isActive,
      assignedLocationIds: pracAssignmentsMap.get(p.id) || [],
    }));

    // 3. Rooms
    const roomRows = await db
      .select({
        id: practiceRooms.id,
        locationId: practiceRooms.locationId,
        name: practiceRooms.name,
        isActive: practiceRooms.isActive,
      })
      .from(practiceRooms)
      .where(
        and(
          eq(practiceRooms.organizationId, organizationId),
          eq(practiceRooms.isActive, true)
        )
      )
      .orderBy(asc(practiceRooms.name));

    // 4. Appointment Types
    const types = await this.listAppointmentTypes(organizationId);
    const activeTypes = types.filter((t) => t.isActive);

    return {
      locations: locRows,
      practitioners,
      rooms: roomRows,
      appointmentTypes: activeTypes,
    };
  },

  async searchPatients(
    organizationId: string,
    query: string,
    limit: number = 10
  ): Promise<SchedulingPatientOptionDTO[]> {
    const validated = patientSearchSchema.parse({ query, limit });
    const pattern = `%${validated.query.trim()}%`;

    const rows = await db
      .select({
        id: patientProfiles.id,
        birthName: patientProfiles.birthName,
        usedName: patientProfiles.usedName,
        firstBirthName: patientProfiles.firstBirthName,
        usedFirstName: patientProfiles.usedFirstName,
        birthDate: patientProfiles.birthDate,
      })
      .from(patientProfiles)
      .where(
        and(
          eq(patientProfiles.organizationId, organizationId),
          eq(patientProfiles.isActive, true),
          or(
            ilike(patientProfiles.birthName, pattern),
            ilike(patientProfiles.usedName, pattern),
            ilike(patientProfiles.firstBirthName, pattern),
            ilike(patientProfiles.usedFirstName, pattern)
          )!
        )
      )
      .limit(validated.limit);

    return rows.map((r) => {
      const lastName = r.usedName || r.birthName;
      const firstName = r.usedFirstName || r.firstBirthName;
      return {
        id: r.id,
        displayName: `${lastName.toUpperCase()} ${firstName}`,
        birthDate: r.birthDate,
      };
    });
  },

  // ==========================================
  // APPOINTMENTS
  // ==========================================
  async listAppointmentsForCalendar(
    organizationId: string,
    params: {
      locationId: string;
      practitionerId?: string | null;
      startDate: string;
      endDate: string;
    }
  ): Promise<AppointmentCalendarEventDTO[]> {
    const validated = appointmentCalendarRangeSchema.parse(params);

    // Verify location exists in tenant
    const loc = await db
      .select()
      .from(practiceLocations)
      .where(
        and(
          eq(practiceLocations.id, validated.locationId),
          eq(practiceLocations.organizationId, organizationId)
        )
      )
      .limit(1);

    if (loc.length === 0 || !loc[0]) {
      throw new AppError('Lieu non trouvé', 404, 'NOT_FOUND');
    }

    // Build UTC range for query bounds covering [startDate, endDate] in location timezone
    // Add 1 day safety buffer on both sides for timezone offset span
    const startUtc = new Date(validated.startDate + 'T00:00:00Z');
    startUtc.setDate(startUtc.getDate() - 1);
    const endUtc = new Date(validated.endDate + 'T23:59:59Z');
    endUtc.setDate(endUtc.getDate() + 1);

    const conditions = [
      eq(appointments.organizationId, organizationId),
      eq(appointments.locationId, validated.locationId),
      gte(appointments.startsAt, startUtc),
      lte(appointments.startsAt, endUtc),
    ];

    if (validated.practitionerId) {
      conditions.push(eq(appointments.practitionerId, validated.practitionerId));
    }

    const rows = await db
      .select({
        appointment: appointments,
        patient: {
          id: patientProfiles.id,
          birthName: patientProfiles.birthName,
          usedName: patientProfiles.usedName,
          firstBirthName: patientProfiles.firstBirthName,
          usedFirstName: patientProfiles.usedFirstName,
        },
        practitioner: {
          id: practicePractitioners.id,
          displayName: practicePractitioners.displayName,
        },
        type: {
          id: appointmentTypes.id,
          name: appointmentTypes.name,
        },
        location: {
          id: practiceLocations.id,
          name: practiceLocations.name,
        },
        room: {
          id: practiceRooms.id,
          name: practiceRooms.name,
        },
      })
      .from(appointments)
      .innerJoin(
        patientProfiles,
        and(
          eq(appointments.patientId, patientProfiles.id),
          eq(appointments.organizationId, patientProfiles.organizationId)
        )
      )
      .innerJoin(
        practicePractitioners,
        and(
          eq(appointments.practitionerId, practicePractitioners.id),
          eq(appointments.organizationId, practicePractitioners.organizationId)
        )
      )
      .innerJoin(
        appointmentTypes,
        and(
          eq(appointments.appointmentTypeId, appointmentTypes.id),
          eq(appointments.organizationId, appointmentTypes.organizationId)
        )
      )
      .innerJoin(
        practiceLocations,
        and(
          eq(appointments.locationId, practiceLocations.id),
          eq(appointments.organizationId, practiceLocations.organizationId)
        )
      )
      .leftJoin(
        practiceRooms,
        and(
          eq(appointments.roomId, practiceRooms.id),
          eq(appointments.organizationId, practiceRooms.organizationId)
        )
      )
      .where(and(...conditions))
      .orderBy(asc(appointments.startsAt));

    const events: AppointmentCalendarEventDTO[] = [];

    for (const r of rows) {
      const appt = r.appointment;
      const startLocal = formatUtcToLocal(appt.startsAt, appt.timezone);
      const endLocal = formatUtcToLocal(appt.endsAt, appt.timezone);

      // Only include if localDate falls within [startDate, endDate]
      if (startLocal.localDate >= validated.startDate && startLocal.localDate <= validated.endDate) {
        const patientName = `${(r.patient.usedName || r.patient.birthName).toUpperCase()} ${
          r.patient.usedFirstName || r.patient.firstBirthName
        }`;

        events.push({
          id: appt.id,
          patientId: appt.patientId,
          patientName,
          practitionerId: appt.practitionerId,
          practitionerName: r.practitioner.displayName,
          appointmentTypeId: appt.appointmentTypeId,
          appointmentTypeName: r.type.name,
          locationId: appt.locationId,
          locationName: r.location.name,
          roomId: appt.roomId,
          roomName: r.room?.name || null,
          startsAt: appt.startsAt.toISOString(),
          endsAt: appt.endsAt.toISOString(),
          occupancyStartsAt: appt.occupancyStartsAt.toISOString(),
          occupancyEndsAt: appt.occupancyEndsAt.toISOString(),
          timezone: appt.timezone,
          status: toAppointmentStatus(appt.status),
          cancellationReasonCode: toCancellationReasonCode(appt.cancellationReasonCode),
          cancelledAt: appt.cancelledAt ? appt.cancelledAt.toISOString() : null,
          noShowAt: appt.noShowAt ? appt.noShowAt.toISOString() : null,
          localDate: startLocal.localDate,
          localStartTime: startLocal.localTime,
          localEndTime: endLocal.localTime,
        });
      }
    }

    return events;
  },

  async getAppointmentById(
    organizationId: string,
    id: string
  ): Promise<AppointmentDTO | null> {
    const rows = await db
      .select({
        appointment: appointments,
        patient: {
          birthName: patientProfiles.birthName,
          usedName: patientProfiles.usedName,
          firstBirthName: patientProfiles.firstBirthName,
          usedFirstName: patientProfiles.usedFirstName,
        },
        practitioner: {
          displayName: practicePractitioners.displayName,
        },
        type: {
          name: appointmentTypes.name,
        },
        location: {
          name: practiceLocations.name,
        },
        room: {
          name: practiceRooms.name,
        },
      })
      .from(appointments)
      .innerJoin(
        patientProfiles,
        and(
          eq(appointments.patientId, patientProfiles.id),
          eq(appointments.organizationId, patientProfiles.organizationId)
        )
      )
      .innerJoin(
        practicePractitioners,
        and(
          eq(appointments.practitionerId, practicePractitioners.id),
          eq(appointments.organizationId, practicePractitioners.organizationId)
        )
      )
      .innerJoin(
        appointmentTypes,
        and(
          eq(appointments.appointmentTypeId, appointmentTypes.id),
          eq(appointments.organizationId, appointmentTypes.organizationId)
        )
      )
      .innerJoin(
        practiceLocations,
        and(
          eq(appointments.locationId, practiceLocations.id),
          eq(appointments.organizationId, practiceLocations.organizationId)
        )
      )
      .leftJoin(
        practiceRooms,
        and(
          eq(appointments.roomId, practiceRooms.id),
          eq(appointments.organizationId, practiceRooms.organizationId)
        )
      )
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.organizationId, organizationId)
        )
      )
      .limit(1);

    if (rows.length === 0 || !rows[0]) return null;

    const r = rows[0];
    const appt = r.appointment;
    const patientName = `${(r.patient.usedName || r.patient.birthName).toUpperCase()} ${
      r.patient.usedFirstName || r.patient.firstBirthName
    }`;

    return {
      id: appt.id,
      organizationId: appt.organizationId,
      patientId: appt.patientId,
      practitionerId: appt.practitionerId,
      appointmentTypeId: appt.appointmentTypeId,
      locationId: appt.locationId,
      roomId: appt.roomId,
      createdByUserId: appt.createdByUserId,
      startsAt: appt.startsAt.toISOString(),
      endsAt: appt.endsAt.toISOString(),
      occupancyStartsAt: appt.occupancyStartsAt.toISOString(),
      occupancyEndsAt: appt.occupancyEndsAt.toISOString(),
      timezone: appt.timezone,
      status: toAppointmentStatus(appt.status),
      cancellationReasonCode: toCancellationReasonCode(appt.cancellationReasonCode),
      cancelledAt: appt.cancelledAt ? appt.cancelledAt.toISOString() : null,
      noShowAt: appt.noShowAt ? appt.noShowAt.toISOString() : null,
      createdAt: appt.createdAt.toISOString(),
      updatedAt: appt.updatedAt.toISOString(),
      patientName,
      practitionerName: r.practitioner.displayName,
      appointmentTypeName: r.type.name,
      locationName: r.location.name,
      roomName: r.room?.name || null,
    };
  },

  async createAppointment(
    organizationId: string,
    createdByUserId: string,
    data: AppointmentCreateInput
  ): Promise<AppointmentDTO> {
    const validated = appointmentCreateSchema.parse(data);

    // 1. Guard Created-by user (must be professional in this tenant)
    const creator = await db
      .select({ id: users.id, profileType: users.profileType })
      .from(users)
      .where(
        and(
          eq(users.id, createdByUserId),
          eq(users.organizationId, organizationId)
        )
      )
      .limit(1);

    if (creator.length === 0 || creator[0]?.profileType !== 'professional') {
      throw new AppError('Créateur non autorisé (professionnel requis)', 403, 'FORBIDDEN');
    }

    // 2. Guard Patient (active in tenant)
    const patient = await db
      .select()
      .from(patientProfiles)
      .where(
        and(
          eq(patientProfiles.id, validated.patientId),
          eq(patientProfiles.organizationId, organizationId)
        )
      )
      .limit(1);

    if (patient.length === 0 || !patient[0]) {
      throw new AppError('Patient non trouvé', 404, 'PATIENT_NOT_FOUND');
    }
    if (!patient[0].isActive) {
      throw new AppError('Le dossier patient est archivé / inactif', 400, 'INACTIVE_PATIENT');
    }

    // 3. Guard Practitioner (active in tenant)
    const practitioner = await db
      .select()
      .from(practicePractitioners)
      .where(
        and(
          eq(practicePractitioners.id, validated.practitionerId),
          eq(practicePractitioners.organizationId, organizationId)
        )
      )
      .limit(1);

    if (practitioner.length === 0 || !practitioner[0]) {
      throw new AppError('Praticien non trouvé', 404, 'PRACTITIONER_NOT_FOUND');
    }
    if (!practitioner[0].isActive) {
      throw new AppError('Le praticien est inactif', 400, 'INACTIVE_PRACTITIONER');
    }

    // 4. Guard Location (active in tenant)
    const location = await db
      .select()
      .from(practiceLocations)
      .where(
        and(
          eq(practiceLocations.id, validated.locationId),
          eq(practiceLocations.organizationId, organizationId)
        )
      )
      .limit(1);

    if (location.length === 0 || !location[0]) {
      throw new AppError('Lieu de consultation non trouvé', 404, 'LOCATION_NOT_FOUND');
    }
    if (!location[0].isActive) {
      throw new AppError('Le lieu de consultation est inactif', 400, 'INACTIVE_LOCATION');
    }

    // 5. Guard Practitioner-Location Assignment (active)
    const assignment = await db
      .select()
      .from(practitionerLocations)
      .where(
        and(
          eq(practitionerLocations.organizationId, organizationId),
          eq(practitionerLocations.practitionerId, validated.practitionerId),
          eq(practitionerLocations.locationId, validated.locationId)
        )
      )
      .limit(1);

    if (assignment.length === 0 || !assignment[0]) {
      throw new AppError(
        "Le praticien n'est pas affecté à ce lieu de consultation",
        400,
        'PRACTITIONER_LOCATION_MISMATCH'
      );
    }
    if (!assignment[0].isActive) {
      throw new AppError("L'affectation du praticien à ce lieu est inactive", 400, 'INACTIVE_ASSIGNMENT');
    }

    // 6. Guard Appointment Type (active in tenant)
    const apptType = await db
      .select()
      .from(appointmentTypes)
      .where(
        and(
          eq(appointmentTypes.id, validated.appointmentTypeId),
          eq(appointmentTypes.organizationId, organizationId)
        )
      )
      .limit(1);

    if (apptType.length === 0 || !apptType[0]) {
      throw new AppError('Type de séance non trouvé', 404, 'TYPE_NOT_FOUND');
    }
    if (!apptType[0].isActive) {
      throw new AppError('Ce type de séance est inactif', 400, 'INACTIVE_TYPE');
    }
    const type = apptType[0];

    // 7. Guard Room (if provided, must be in same tenant, same location, active)
    if (validated.roomId) {
      const room = await db
        .select()
        .from(practiceRooms)
        .where(
          and(
            eq(practiceRooms.id, validated.roomId),
            eq(practiceRooms.organizationId, organizationId)
          )
        )
      .limit(1);

      if (room.length === 0 || !room[0]) {
        throw new AppError('Salle non trouvée', 404, 'ROOM_NOT_FOUND');
      }
      if (room[0].locationId !== validated.locationId) {
        throw new AppError(
          "La salle sélectionnée n'appartient pas au lieu de consultation",
          400,
          'ROOM_LOCATION_MISMATCH'
        );
      }
      if (!room[0].isActive) {
        throw new AppError('La salle sélectionnée est inactive', 400, 'INACTIVE_ROOM');
      }
    }

    // 8. Overnight check
    if (isOvernight(validated.localStartTime, type.durationMinutes)) {
      throw new AppError(
        'Les séances traversant minuit ne sont pas autorisées',
        400,
        'OVERNIGHT_APPOINTMENT_NOT_SUPPORTED'
      );
    }

    // 9. Timezone round-trip check
    const tzCheck = verifyTimezoneRoundTrip(
      validated.localDate,
      validated.localStartTime,
      location[0].timezone
    );
    if (!tzCheck.isValid) {
      throw new AppError(
        'Horaire local invalide ou inexistant pour le fuseau horaire du lieu',
        400,
        'INVALID_LOCAL_TIME'
      );
    }

    // 10. Availability check
    const rules = await this.listAvailabilityRules(
      organizationId,
      validated.practitionerId,
      validated.locationId
    );
    const exceptions = await this.listAvailabilityExceptions(
      organizationId,
      validated.practitionerId,
      validated.locationId,
      validated.localDate,
      validated.localDate
    );

    const availableIntervals = computeEffectiveAvailability({
      localDate: validated.localDate,
      rules,
      exceptions,
    });

    const isAvailable = isSlotAvailable({
      localStartTime: validated.localStartTime,
      durationMinutes: type.durationMinutes,
      availableIntervals,
    });

    if (!isAvailable) {
      throw new AppError(
        "Le créneau demandé n'est pas couvert par les disponibilités du praticien",
        400,
        'PRACTITIONER_UNAVAILABLE'
      );
    }

    // 11. Calculate timestamps & occupancy windows
    const startsAt = tzCheck.utcDate;
    const endsAt = new Date(startsAt.getTime() + type.durationMinutes * 60 * 1000);
    const occupancyStartsAt = new Date(
      startsAt.getTime() - type.bufferBeforeMinutes * 60 * 1000
    );
    const occupancyEndsAt = new Date(
      endsAt.getTime() + type.bufferAfterMinutes * 60 * 1000
    );

    const id = randomUUID();

    try {
      const [created] = await db
        .insert(appointments)
        .values({
          id,
          organizationId,
          patientId: validated.patientId,
          practitionerId: validated.practitionerId,
          appointmentTypeId: validated.appointmentTypeId,
          locationId: validated.locationId,
          roomId: validated.roomId || null,
          createdByUserId,
          startsAt,
          endsAt,
          occupancyStartsAt,
          occupancyEndsAt,
          timezone: location[0].timezone,
          status: 'scheduled',
        })
        .returning();

      if (!created) {
        throw new AppError('Échec de la création du rendez-vous', 500);
      }

      return {
        id: created.id,
        organizationId: created.organizationId,
        patientId: created.patientId,
        practitionerId: created.practitionerId,
        appointmentTypeId: created.appointmentTypeId,
        locationId: created.locationId,
        roomId: created.roomId,
        createdByUserId: created.createdByUserId,
        startsAt: created.startsAt.toISOString(),
        endsAt: created.endsAt.toISOString(),
        occupancyStartsAt: created.occupancyStartsAt.toISOString(),
        occupancyEndsAt: created.occupancyEndsAt.toISOString(),
        timezone: created.timezone,
        status: toAppointmentStatus(created.status),
        cancellationReasonCode: toCancellationReasonCode(created.cancellationReasonCode),
        cancelledAt: created.cancelledAt ? created.cancelledAt.toISOString() : null,
        noShowAt: created.noShowAt ? created.noShowAt.toISOString() : null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (error: unknown) {
      if (isPgConflictError(error)) {
        throw new AppError(
          'Conflit de réservation: ce créneau est déjà réservé pour le praticien, le patient ou la salle',
          409,
          'SCHEDULING_CONFLICT'
        );
      }
      throw error;
    }
  },

  async rescheduleAppointment(
    organizationId: string,
    createdByUserId: string,
    data: AppointmentRescheduleInput
  ): Promise<AppointmentDTO> {
    const validated = appointmentRescheduleSchema.parse(data);

    // Verify existing appointment exists in tenant
    const existing = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, validated.appointmentId),
          eq(appointments.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0 || !existing[0]) {
      throw new AppError('Séance non trouvée', 404, 'NOT_FOUND');
    }

    if (existing[0].status !== 'scheduled') {
      throw new AppError('Impossible de replanifier une séance non planifiée', 400, 'APPOINTMENT_NOT_SCHEDULED');
    }

    // 1. Guard Creator (must be professional)
    const creator = await db
      .select({ id: users.id, profileType: users.profileType })
      .from(users)
      .where(
        and(
          eq(users.id, createdByUserId),
          eq(users.organizationId, organizationId)
        )
      )
      .limit(1);

    if (creator.length === 0 || creator[0]?.profileType !== 'professional') {
      throw new AppError('Action non autorisée (professionnel requis)', 403, 'FORBIDDEN');
    }

    // 2. Guard Patient
    const patient = await db
      .select()
      .from(patientProfiles)
      .where(
        and(
          eq(patientProfiles.id, validated.patientId),
          eq(patientProfiles.organizationId, organizationId)
        )
      )
      .limit(1);

    if (patient.length === 0 || !patient[0]) {
      throw new AppError('Patient non trouvé', 404, 'PATIENT_NOT_FOUND');
    }
    if (!patient[0].isActive) {
      throw new AppError('Le dossier patient est archivé / inactif', 400, 'INACTIVE_PATIENT');
    }

    // 3. Guard Practitioner
    const practitioner = await db
      .select()
      .from(practicePractitioners)
      .where(
        and(
          eq(practicePractitioners.id, validated.practitionerId),
          eq(practicePractitioners.organizationId, organizationId)
        )
      )
      .limit(1);

    if (practitioner.length === 0 || !practitioner[0]) {
      throw new AppError('Praticien non trouvé', 404, 'PRACTITIONER_NOT_FOUND');
    }
    if (!practitioner[0].isActive) {
      throw new AppError('Le praticien est inactif', 400, 'INACTIVE_PRACTITIONER');
    }

    // 4. Guard Location
    const location = await db
      .select()
      .from(practiceLocations)
      .where(
        and(
          eq(practiceLocations.id, validated.locationId),
          eq(practiceLocations.organizationId, organizationId)
        )
      )
      .limit(1);

    if (location.length === 0 || !location[0]) {
      throw new AppError('Lieu de consultation non trouvé', 404, 'LOCATION_NOT_FOUND');
    }
    if (!location[0].isActive) {
      throw new AppError('Le lieu de consultation est inactif', 400, 'INACTIVE_LOCATION');
    }

    // 5. Guard Practitioner-Location Assignment
    const assignment = await db
      .select()
      .from(practitionerLocations)
      .where(
        and(
          eq(practitionerLocations.organizationId, organizationId),
          eq(practitionerLocations.practitionerId, validated.practitionerId),
          eq(practitionerLocations.locationId, validated.locationId)
        )
      )
      .limit(1);

    if (assignment.length === 0 || !assignment[0]) {
      throw new AppError(
        "Le praticien n'est pas affecté à ce lieu de consultation",
        400,
        'PRACTITIONER_LOCATION_MISMATCH'
      );
    }
    if (!assignment[0].isActive) {
      throw new AppError("L'affectation du praticien à ce lieu est inactive", 400, 'INACTIVE_ASSIGNMENT');
    }

    // 6. Guard Type
    const apptType = await db
      .select()
      .from(appointmentTypes)
      .where(
        and(
          eq(appointmentTypes.id, validated.appointmentTypeId),
          eq(appointmentTypes.organizationId, organizationId)
        )
      )
      .limit(1);

    if (apptType.length === 0 || !apptType[0]) {
      throw new AppError('Type de séance non trouvé', 404, 'TYPE_NOT_FOUND');
    }
    if (!apptType[0].isActive) {
      throw new AppError('Ce type de séance est inactif', 400, 'INACTIVE_TYPE');
    }
    const type = apptType[0];

    // 7. Guard Room
    if (validated.roomId) {
      const room = await db
        .select()
        .from(practiceRooms)
        .where(
          and(
            eq(practiceRooms.id, validated.roomId),
            eq(practiceRooms.organizationId, organizationId)
          )
        )
        .limit(1);

      if (room.length === 0 || !room[0]) {
        throw new AppError('Salle non trouvée', 404, 'ROOM_NOT_FOUND');
      }
      if (room[0].locationId !== validated.locationId) {
        throw new AppError(
          "La salle sélectionnée n'appartient pas au lieu de consultation",
          400,
          'ROOM_LOCATION_MISMATCH'
        );
      }
      if (!room[0].isActive) {
        throw new AppError('La salle sélectionnée est inactive', 400, 'INACTIVE_ROOM');
      }
    }

    // 8. Overnight check
    if (isOvernight(validated.localStartTime, type.durationMinutes)) {
      throw new AppError(
        'Les séances traversant minuit ne sont pas autorisées',
        400,
        'OVERNIGHT_APPOINTMENT_NOT_SUPPORTED'
      );
    }

    // 9. Timezone round-trip check
    const tzCheck = verifyTimezoneRoundTrip(
      validated.localDate,
      validated.localStartTime,
      location[0].timezone
    );
    if (!tzCheck.isValid) {
      throw new AppError(
        'Horaire local invalide ou inexistant pour le fuseau horaire du lieu',
        400,
        'INVALID_LOCAL_TIME'
      );
    }

    // 10. Availability check
    const rules = await this.listAvailabilityRules(
      organizationId,
      validated.practitionerId,
      validated.locationId
    );
    const exceptions = await this.listAvailabilityExceptions(
      organizationId,
      validated.practitionerId,
      validated.locationId,
      validated.localDate,
      validated.localDate
    );

    const availableIntervals = computeEffectiveAvailability({
      localDate: validated.localDate,
      rules,
      exceptions,
    });

    const isAvailable = isSlotAvailable({
      localStartTime: validated.localStartTime,
      durationMinutes: type.durationMinutes,
      availableIntervals,
    });

    if (!isAvailable) {
      throw new AppError(
        "Le créneau demandé n'est pas couvert par les disponibilités du praticien",
        400,
        'PRACTITIONER_UNAVAILABLE'
      );
    }

    // 11. Calculate timestamps & occupancy windows
    const startsAt = tzCheck.utcDate;
    const endsAt = new Date(startsAt.getTime() + type.durationMinutes * 60 * 1000);
    const occupancyStartsAt = new Date(
      startsAt.getTime() - type.bufferBeforeMinutes * 60 * 1000
    );
    const occupancyEndsAt = new Date(
      endsAt.getTime() + type.bufferAfterMinutes * 60 * 1000
    );

    try {
      const [updated] = await db
        .update(appointments)
        .set({
          patientId: validated.patientId,
          practitionerId: validated.practitionerId,
          appointmentTypeId: validated.appointmentTypeId,
          locationId: validated.locationId,
          roomId: validated.roomId || null,
          startsAt,
          endsAt,
          occupancyStartsAt,
          occupancyEndsAt,
          timezone: location[0].timezone,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(appointments.id, validated.appointmentId),
            eq(appointments.organizationId, organizationId)
          )
        )
        .returning();

      if (!updated) {
        throw new AppError('Échec de la replanification de la séance', 500);
      }

      return {
        id: updated.id,
        organizationId: updated.organizationId,
        patientId: updated.patientId,
        practitionerId: updated.practitionerId,
        appointmentTypeId: updated.appointmentTypeId,
        locationId: updated.locationId,
        roomId: updated.roomId,
        createdByUserId: updated.createdByUserId,
        startsAt: updated.startsAt.toISOString(),
        endsAt: updated.endsAt.toISOString(),
        occupancyStartsAt: updated.occupancyStartsAt.toISOString(),
        occupancyEndsAt: updated.occupancyEndsAt.toISOString(),
        timezone: updated.timezone,
        status: toAppointmentStatus(updated.status),
        cancellationReasonCode: toCancellationReasonCode(updated.cancellationReasonCode),
        cancelledAt: updated.cancelledAt ? updated.cancelledAt.toISOString() : null,
        noShowAt: updated.noShowAt ? updated.noShowAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (error: unknown) {
      if (isPgConflictError(error)) {
        throw new AppError(
          'Conflit de réservation: ce créneau est déjà réservé pour le praticien, le patient ou la salle',
          409,
          'SCHEDULING_CONFLICT'
        );
      }
      throw error;
    }
  },

  // ==========================================
  // APPOINTMENT LIFECYCLE (CANCEL & NO-SHOW)
  // ==========================================
  async cancelAppointment(
    organizationId: string,
    userId: string,
    data: AppointmentCancelInput
  ): Promise<AppointmentDTO> {
    const validated = appointmentCancelSchema.parse(data);

    // 1. Guard Creator (must be professional in this tenant)
    const actor = await db
      .select({ id: users.id, profileType: users.profileType })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, organizationId)
        )
      )
      .limit(1);

    if (actor.length === 0 || actor[0]?.profileType !== 'professional') {
      throw new AppError('Action non autorisée (professionnel requis)', 403, 'FORBIDDEN');
    }

    // 2. Fetch existing appointment
    const existing = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, validated.appointmentId),
          eq(appointments.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0 || !existing[0]) {
      throw new AppError('Séance non trouvée', 404, 'NOT_FOUND');
    }

    if (existing[0].status !== 'scheduled') {
      throw new AppError('Seules les séances planifiées peuvent être annulées', 400, 'APPOINTMENT_NOT_SCHEDULED');
    }

    // 3. Update appointment
    const [updated] = await db
      .update(appointments)
      .set({
        status: 'cancelled',
        cancellationReasonCode: validated.reasonCode,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(appointments.id, validated.appointmentId),
          eq(appointments.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new AppError("Échec de l'annulation de la séance", 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      patientId: updated.patientId,
      practitionerId: updated.practitionerId,
      appointmentTypeId: updated.appointmentTypeId,
      locationId: updated.locationId,
      roomId: updated.roomId,
      createdByUserId: updated.createdByUserId,
      startsAt: updated.startsAt.toISOString(),
      endsAt: updated.endsAt.toISOString(),
      occupancyStartsAt: updated.occupancyStartsAt.toISOString(),
      occupancyEndsAt: updated.occupancyEndsAt.toISOString(),
      timezone: updated.timezone,
      status: toAppointmentStatus(updated.status),
      cancellationReasonCode: toCancellationReasonCode(updated.cancellationReasonCode),
      cancelledAt: updated.cancelledAt ? updated.cancelledAt.toISOString() : null,
      noShowAt: updated.noShowAt ? updated.noShowAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async markAppointmentNoShow(
    organizationId: string,
    userId: string,
    appointmentId: string
  ): Promise<AppointmentDTO> {
    const validated = appointmentNoShowSchema.parse({ appointmentId });

    // 1. Guard Creator (must be professional in this tenant)
    const actor = await db
      .select({ id: users.id, profileType: users.profileType })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, organizationId)
        )
      )
      .limit(1);

    if (actor.length === 0 || actor[0]?.profileType !== 'professional') {
      throw new AppError('Action non autorisée (professionnel requis)', 403, 'FORBIDDEN');
    }

    // 2. Fetch existing appointment
    const existing = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, validated.appointmentId),
          eq(appointments.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0 || !existing[0]) {
      throw new AppError('Séance non trouvée', 404, 'NOT_FOUND');
    }

    if (existing[0].status !== 'scheduled') {
      throw new AppError('Seules les séances planifiées peuvent être marquées absentes', 400, 'APPOINTMENT_NOT_SCHEDULED');
    }

    // 3. Guard against future appointment no-show
    const now = new Date();
    if (existing[0].startsAt > now) {
      throw new AppError(
        'Impossible de marquer absent pour une séance future',
        400,
        'FUTURE_NO_SHOW_FORBIDDEN'
      );
    }

    // 4. Update appointment
    const [updated] = await db
      .update(appointments)
      .set({
        status: 'no_show',
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(appointments.id, validated.appointmentId),
          eq(appointments.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new AppError('Échec du marquage absent de la séance', 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      patientId: updated.patientId,
      practitionerId: updated.practitionerId,
      appointmentTypeId: updated.appointmentTypeId,
      locationId: updated.locationId,
      roomId: updated.roomId,
      createdByUserId: updated.createdByUserId,
      startsAt: updated.startsAt.toISOString(),
      endsAt: updated.endsAt.toISOString(),
      occupancyStartsAt: updated.occupancyStartsAt.toISOString(),
      occupancyEndsAt: updated.occupancyEndsAt.toISOString(),
      timezone: updated.timezone,
      status: toAppointmentStatus(updated.status),
      cancellationReasonCode: toCancellationReasonCode(updated.cancellationReasonCode),
      cancelledAt: updated.cancelledAt ? updated.cancelledAt.toISOString() : null,
      noShowAt: updated.noShowAt ? updated.noShowAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  // ==========================================
  // WAITING LIST
  // ==========================================
  async createWaitlistEntry(
    organizationId: string,
    createdByUserId: string,
    data: WaitlistCreateInput
  ): Promise<WaitlistEntryDTO> {
    const validated = waitlistCreateSchema.parse(data);

    // 1. Guard Actor
    const actor = await db
      .select({ id: users.id, profileType: users.profileType })
      .from(users)
      .where(
        and(
          eq(users.id, createdByUserId),
          eq(users.organizationId, organizationId)
        )
      )
      .limit(1);

    if (actor.length === 0 || actor[0]?.profileType !== 'professional') {
      throw new AppError('Action non autorisée (professionnel requis)', 403, 'FORBIDDEN');
    }

    // 2. Guard Patient
    const patient = await db
      .select()
      .from(patientProfiles)
      .where(
        and(
          eq(patientProfiles.id, validated.patientId),
          eq(patientProfiles.organizationId, organizationId)
        )
      )
      .limit(1);

    if (patient.length === 0 || !patient[0]) {
      throw new AppError('Patient non trouvé', 404, 'PATIENT_NOT_FOUND');
    }
    if (!patient[0].isActive) {
      throw new AppError('Le dossier patient est archivé / inactif', 400, 'INACTIVE_PATIENT');
    }

    // 3. Guard Type
    const apptType = await db
      .select()
      .from(appointmentTypes)
      .where(
        and(
          eq(appointmentTypes.id, validated.appointmentTypeId),
          eq(appointmentTypes.organizationId, organizationId)
        )
      )
      .limit(1);

    if (apptType.length === 0 || !apptType[0]) {
      throw new AppError('Type de séance non trouvé', 404, 'TYPE_NOT_FOUND');
    }
    if (!apptType[0].isActive) {
      throw new AppError('Ce type de séance est inactif', 400, 'INACTIVE_TYPE');
    }

    // 4. Guard Location
    const location = await db
      .select()
      .from(practiceLocations)
      .where(
        and(
          eq(practiceLocations.id, validated.locationId),
          eq(practiceLocations.organizationId, organizationId)
        )
      )
      .limit(1);

    if (location.length === 0 || !location[0]) {
      throw new AppError('Lieu de consultation non trouvé', 404, 'LOCATION_NOT_FOUND');
    }
    if (!location[0].isActive) {
      throw new AppError('Le lieu de consultation est inactif', 400, 'INACTIVE_LOCATION');
    }

    // 5. Guard Practitioner (if specified)
    if (validated.practitionerId) {
      const practitioner = await db
        .select()
        .from(practicePractitioners)
        .where(
          and(
            eq(practicePractitioners.id, validated.practitionerId),
            eq(practicePractitioners.organizationId, organizationId)
          )
        )
        .limit(1);

      if (practitioner.length === 0 || !practitioner[0]) {
        throw new AppError('Praticien non trouvé', 404, 'PRACTITIONER_NOT_FOUND');
      }
      if (!practitioner[0].isActive) {
        throw new AppError('Le praticien est inactif', 400, 'INACTIVE_PRACTITIONER');
      }

      const assignment = await db
        .select()
        .from(practitionerLocations)
        .where(
          and(
            eq(practitionerLocations.organizationId, organizationId),
            eq(practitionerLocations.practitionerId, validated.practitionerId),
            eq(practitionerLocations.locationId, validated.locationId)
          )
        )
        .limit(1);

      if (assignment.length === 0 || !assignment[0]) {
        throw new AppError(
          "Le praticien n'est pas affecté à ce lieu de consultation",
          400,
          'PRACTITIONER_LOCATION_MISMATCH'
        );
      }
      if (!assignment[0].isActive) {
        throw new AppError("L'affectation du praticien à ce lieu est inactive", 400, 'INACTIVE_ASSIGNMENT');
      }
    }

    const id = randomUUID();
    const [created] = await db
      .insert(appointmentWaitlistEntries)
      .values({
        id,
        organizationId,
        patientId: validated.patientId,
        appointmentTypeId: validated.appointmentTypeId,
        locationId: validated.locationId,
        practitionerId: validated.practitionerId || null,
        preferredDateFrom: validated.preferredDateFrom,
        preferredDateUntil: validated.preferredDateUntil || null,
        preferredStartTime: validated.preferredStartTime || null,
        preferredEndTime: validated.preferredEndTime || null,
        timezone: location[0].timezone,
        status: 'waiting',
        createdByUserId,
      })
      .returning();

    if (!created) {
      throw new AppError("Échec de la création de l'entrée en liste d'attente", 500);
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      patientId: created.patientId,
      appointmentTypeId: created.appointmentTypeId,
      locationId: created.locationId,
      practitionerId: created.practitionerId,
      preferredDateFrom: created.preferredDateFrom,
      preferredDateUntil: created.preferredDateUntil,
      preferredStartTime: created.preferredStartTime,
      preferredEndTime: created.preferredEndTime,
      timezone: created.timezone,
      status: toWaitlistStatus(created.status),
      resolutionCode: toWaitlistResolutionCode(created.resolutionCode),
      resolvedAt: created.resolvedAt ? created.resolvedAt.toISOString() : null,
      resolvedAppointmentId: created.resolvedAppointmentId,
      createdByUserId: created.createdByUserId,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  },

  async updateWaitlistEntry(
    organizationId: string,
    userId: string,
    data: WaitlistUpdateInput
  ): Promise<WaitlistEntryDTO> {
    const validated = waitlistUpdateSchema.parse(data);

    // 1. Guard Actor
    const actor = await db
      .select({ id: users.id, profileType: users.profileType })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, organizationId)
        )
      )
      .limit(1);

    if (actor.length === 0 || actor[0]?.profileType !== 'professional') {
      throw new AppError('Action non autorisée (professionnel requis)', 403, 'FORBIDDEN');
    }

    // 2. Fetch existing
    const existing = await db
      .select()
      .from(appointmentWaitlistEntries)
      .where(
        and(
          eq(appointmentWaitlistEntries.id, validated.id),
          eq(appointmentWaitlistEntries.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0 || !existing[0]) {
      throw new AppError("Entrée de liste d'attente non trouvée", 404, 'NOT_FOUND');
    }

    if (existing[0].status !== 'waiting') {
      throw new AppError(
        'Seules les demandes en attente peuvent être modifiées',
        400,
        'WAITLIST_ENTRY_IMMUTABLE'
      );
    }

    // 3. Guard Patient
    const patient = await db
      .select()
      .from(patientProfiles)
      .where(
        and(
          eq(patientProfiles.id, validated.patientId),
          eq(patientProfiles.organizationId, organizationId)
        )
      )
      .limit(1);

    if (patient.length === 0 || !patient[0]) {
      throw new AppError('Patient non trouvé', 404, 'PATIENT_NOT_FOUND');
    }
    if (!patient[0].isActive) {
      throw new AppError('Le dossier patient est archivé / inactif', 400, 'INACTIVE_PATIENT');
    }

    // 4. Guard Type
    const apptType = await db
      .select()
      .from(appointmentTypes)
      .where(
        and(
          eq(appointmentTypes.id, validated.appointmentTypeId),
          eq(appointmentTypes.organizationId, organizationId)
        )
      )
      .limit(1);

    if (apptType.length === 0 || !apptType[0]) {
      throw new AppError('Type de séance non trouvé', 404, 'TYPE_NOT_FOUND');
    }
    if (!apptType[0].isActive) {
      throw new AppError('Ce type de séance est inactif', 400, 'INACTIVE_TYPE');
    }

    // 5. Guard Location
    const location = await db
      .select()
      .from(practiceLocations)
      .where(
        and(
          eq(practiceLocations.id, validated.locationId),
          eq(practiceLocations.organizationId, organizationId)
        )
      )
      .limit(1);

    if (location.length === 0 || !location[0]) {
      throw new AppError('Lieu de consultation non trouvé', 404, 'LOCATION_NOT_FOUND');
    }
    if (!location[0].isActive) {
      throw new AppError('Le lieu de consultation est inactif', 400, 'INACTIVE_LOCATION');
    }

    // 6. Guard Practitioner (if specified)
    if (validated.practitionerId) {
      const practitioner = await db
        .select()
        .from(practicePractitioners)
        .where(
          and(
            eq(practicePractitioners.id, validated.practitionerId),
            eq(practicePractitioners.organizationId, organizationId)
          )
        )
        .limit(1);

      if (practitioner.length === 0 || !practitioner[0]) {
        throw new AppError('Praticien non trouvé', 404, 'PRACTITIONER_NOT_FOUND');
      }
      if (!practitioner[0].isActive) {
        throw new AppError('Le praticien est inactif', 400, 'INACTIVE_PRACTITIONER');
      }

      const assignment = await db
        .select()
        .from(practitionerLocations)
        .where(
          and(
            eq(practitionerLocations.organizationId, organizationId),
            eq(practitionerLocations.practitionerId, validated.practitionerId),
            eq(practitionerLocations.locationId, validated.locationId)
          )
        )
        .limit(1);

      if (assignment.length === 0 || !assignment[0]) {
        throw new AppError(
          "Le praticien n'est pas affecté à ce lieu de consultation",
          400,
          'PRACTITIONER_LOCATION_MISMATCH'
        );
      }
      if (!assignment[0].isActive) {
        throw new AppError("L'affectation du praticien à ce lieu est inactive", 400, 'INACTIVE_ASSIGNMENT');
      }
    }

    const [updated] = await db
      .update(appointmentWaitlistEntries)
      .set({
        patientId: validated.patientId,
        appointmentTypeId: validated.appointmentTypeId,
        locationId: validated.locationId,
        practitionerId: validated.practitionerId || null,
        preferredDateFrom: validated.preferredDateFrom,
        preferredDateUntil: validated.preferredDateUntil || null,
        preferredStartTime: validated.preferredStartTime || null,
        preferredEndTime: validated.preferredEndTime || null,
        timezone: location[0].timezone,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(appointmentWaitlistEntries.id, validated.id),
          eq(appointmentWaitlistEntries.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw new AppError("Échec de la mise à jour de l'entrée en liste d'attente", 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      patientId: updated.patientId,
      appointmentTypeId: updated.appointmentTypeId,
      locationId: updated.locationId,
      practitionerId: updated.practitionerId,
      preferredDateFrom: updated.preferredDateFrom,
      preferredDateUntil: updated.preferredDateUntil,
      preferredStartTime: updated.preferredStartTime,
      preferredEndTime: updated.preferredEndTime,
      timezone: updated.timezone,
      status: toWaitlistStatus(updated.status),
      resolutionCode: toWaitlistResolutionCode(updated.resolutionCode),
      resolvedAt: updated.resolvedAt ? updated.resolvedAt.toISOString() : null,
      resolvedAppointmentId: updated.resolvedAppointmentId,
      createdByUserId: updated.createdByUserId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async resolveWaitlistEntry(
    organizationId: string,
    userId: string,
    data: WaitlistResolveInput
  ): Promise<WaitlistEntryDTO> {
    const validated = waitlistResolveSchema.parse(data);

    // 1. Guard Actor
    const actor = await db
      .select({ id: users.id, profileType: users.profileType })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, organizationId)
        )
      )
      .limit(1);

    if (actor.length === 0 || actor[0]?.profileType !== 'professional') {
      throw new AppError('Action non autorisée (professionnel requis)', 403, 'FORBIDDEN');
    }

    // 2. Fetch existing
    const existing = await db
      .select()
      .from(appointmentWaitlistEntries)
      .where(
        and(
          eq(appointmentWaitlistEntries.id, validated.id),
          eq(appointmentWaitlistEntries.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0 || !existing[0]) {
      throw new AppError("Entrée de liste d'attente non trouvée", 404, 'NOT_FOUND');
    }

    const entry = existing[0];
    if (entry.status !== 'waiting') {
      throw new AppError(
        'Cette demande est déjà résolue',
        400,
        'WAITLIST_ENTRY_IMMUTABLE'
      );
    }

    // 3. If booked, validate appointment match
    if (validated.resolutionCode === 'booked') {
      if (!validated.resolvedAppointmentId) {
        throw new AppError(
          'Une séance est obligatoire pour la résolution "Planifié"',
          400,
          'WAITLIST_APPOINTMENT_REQUIRED'
        );
      }

      const apptRows = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.id, validated.resolvedAppointmentId),
            eq(appointments.organizationId, organizationId)
          )
        )
        .limit(1);

      if (apptRows.length === 0 || !apptRows[0]) {
        throw new AppError('Séance non trouvée', 404, 'APPOINTMENT_NOT_FOUND');
      }

      const appt = apptRows[0];

      if (appt.status !== 'scheduled') {
        throw new AppError(
          'La séance associée doit être dans le statut planifiée',
          400,
          'APPOINTMENT_NOT_SCHEDULED'
        );
      }

      if (appt.patientId !== entry.patientId) {
        throw new AppError(
          'La séance ne correspond pas au patient de la liste d\'attente',
          400,
          'WAITLIST_APPOINTMENT_MISMATCH'
        );
      }

      if (appt.appointmentTypeId !== entry.appointmentTypeId) {
        throw new AppError(
          'Le type de séance ne correspond pas à la demande en attente',
          400,
          'WAITLIST_APPOINTMENT_MISMATCH'
        );
      }

      if (appt.locationId !== entry.locationId) {
        throw new AppError(
          'Le lieu de séance ne correspond pas à la demande en attente',
          400,
          'WAITLIST_APPOINTMENT_MISMATCH'
        );
      }

      if (entry.practitionerId && appt.practitionerId !== entry.practitionerId) {
        throw new AppError(
          'Le praticien ne correspond pas au praticien demandé',
          400,
          'WAITLIST_APPOINTMENT_MISMATCH'
        );
      }

      // Convert appointment time into waitlist entry timezone snapshot
      const startLocal = formatUtcToLocal(appt.startsAt, entry.timezone);
      const endLocal = formatUtcToLocal(appt.endsAt, entry.timezone);

      if (startLocal.localDate < entry.preferredDateFrom) {
        throw new AppError(
          'La date de la séance est antérieure à la date de début demandée',
          400,
          'WAITLIST_APPOINTMENT_MISMATCH'
        );
      }

      if (entry.preferredDateUntil && startLocal.localDate > entry.preferredDateUntil) {
        throw new AppError(
          'La date de la séance est postérieure à la date de fin demandée',
          400,
          'WAITLIST_APPOINTMENT_MISMATCH'
        );
      }

      if (entry.preferredStartTime && entry.preferredEndTime) {
        const prefStart = entry.preferredStartTime.slice(0, 5);
        const prefEnd = entry.preferredEndTime.slice(0, 5);
        if (startLocal.localTime < prefStart || endLocal.localTime > prefEnd) {
          throw new AppError(
            "L'horaire de la séance ne respecte pas les préférences horaires demandées",
            400,
            'WAITLIST_APPOINTMENT_MISMATCH'
          );
        }
      }
    }

    const [resolved] = await db
      .update(appointmentWaitlistEntries)
      .set({
        status: 'resolved',
        resolutionCode: validated.resolutionCode,
        resolvedAppointmentId:
          validated.resolutionCode === 'booked' ? validated.resolvedAppointmentId : null,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(appointmentWaitlistEntries.id, validated.id),
          eq(appointmentWaitlistEntries.organizationId, organizationId)
        )
      )
      .returning();

    if (!resolved) {
      throw new AppError("Échec de la résolution de l'entrée en liste d'attente", 500);
    }

    return {
      id: resolved.id,
      organizationId: resolved.organizationId,
      patientId: resolved.patientId,
      appointmentTypeId: resolved.appointmentTypeId,
      locationId: resolved.locationId,
      practitionerId: resolved.practitionerId,
      preferredDateFrom: resolved.preferredDateFrom,
      preferredDateUntil: resolved.preferredDateUntil,
      preferredStartTime: resolved.preferredStartTime,
      preferredEndTime: resolved.preferredEndTime,
      timezone: resolved.timezone,
      status: toWaitlistStatus(resolved.status),
      resolutionCode: toWaitlistResolutionCode(resolved.resolutionCode),
      resolvedAt: resolved.resolvedAt ? resolved.resolvedAt.toISOString() : null,
      resolvedAppointmentId: resolved.resolvedAppointmentId,
      createdByUserId: resolved.createdByUserId,
      createdAt: resolved.createdAt.toISOString(),
      updatedAt: resolved.updatedAt.toISOString(),
    };
  },

  async listWaitlistEntries(
    organizationId: string,
    filters?: WaitlistFilters
  ): Promise<{ entries: WaitlistEntryDTO[]; total: number }> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 25;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(appointmentWaitlistEntries.organizationId, organizationId)];

    if (filters?.status) {
      conditions.push(eq(appointmentWaitlistEntries.status, filters.status));
    }
    if (filters?.locationId) {
      conditions.push(eq(appointmentWaitlistEntries.locationId, filters.locationId));
    }
    if (filters?.practitionerId) {
      conditions.push(eq(appointmentWaitlistEntries.practitionerId, filters.practitionerId));
    }
    if (filters?.appointmentTypeId) {
      conditions.push(eq(appointmentWaitlistEntries.appointmentTypeId, filters.appointmentTypeId));
    }

    // Optional patient search condition
    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(patientProfiles.birthName, q),
          ilike(patientProfiles.usedName, q),
          ilike(patientProfiles.firstBirthName, q),
          ilike(patientProfiles.usedFirstName, q)
        )!
      );
    }

    const whereClause = and(...conditions);

    const [totalRow] = await db
      .select({ val: count() })
      .from(appointmentWaitlistEntries)
      .innerJoin(
        patientProfiles,
        and(
          eq(appointmentWaitlistEntries.patientId, patientProfiles.id),
          eq(appointmentWaitlistEntries.organizationId, patientProfiles.organizationId)
        )
      )
      .where(whereClause);

    const rows = await db
      .select({
        entry: appointmentWaitlistEntries,
        patient: {
          birthName: patientProfiles.birthName,
          usedName: patientProfiles.usedName,
          firstBirthName: patientProfiles.firstBirthName,
          usedFirstName: patientProfiles.usedFirstName,
        },
        practitioner: {
          displayName: practicePractitioners.displayName,
        },
        type: {
          name: appointmentTypes.name,
        },
        location: {
          name: practiceLocations.name,
        },
      })
      .from(appointmentWaitlistEntries)
      .innerJoin(
        patientProfiles,
        and(
          eq(appointmentWaitlistEntries.patientId, patientProfiles.id),
          eq(appointmentWaitlistEntries.organizationId, patientProfiles.organizationId)
        )
      )
      .innerJoin(
        appointmentTypes,
        and(
          eq(appointmentWaitlistEntries.appointmentTypeId, appointmentTypes.id),
          eq(appointmentWaitlistEntries.organizationId, appointmentTypes.organizationId)
        )
      )
      .innerJoin(
        practiceLocations,
        and(
          eq(appointmentWaitlistEntries.locationId, practiceLocations.id),
          eq(appointmentWaitlistEntries.organizationId, practiceLocations.organizationId)
        )
      )
      .leftJoin(
        practicePractitioners,
        and(
          eq(appointmentWaitlistEntries.practitionerId, practicePractitioners.id),
          eq(appointmentWaitlistEntries.organizationId, practicePractitioners.organizationId)
        )
      )
      .where(whereClause)
      .orderBy(desc(appointmentWaitlistEntries.createdAt))
      .limit(pageSize)
      .offset(offset);

    const entries: WaitlistEntryDTO[] = rows.map((r) => {
      const e = r.entry;
      const patientName = `${(r.patient.usedName || r.patient.birthName).toUpperCase()} ${
        r.patient.usedFirstName || r.patient.firstBirthName
      }`;

      return {
        id: e.id,
        organizationId: e.organizationId,
        patientId: e.patientId,
        patientName,
        appointmentTypeId: e.appointmentTypeId,
        appointmentTypeName: r.type.name,
        locationId: e.locationId,
        locationName: r.location.name,
        practitionerId: e.practitionerId,
        practitionerName: r.practitioner?.displayName || null,
        preferredDateFrom: e.preferredDateFrom,
        preferredDateUntil: e.preferredDateUntil,
        preferredStartTime: e.preferredStartTime,
        preferredEndTime: e.preferredEndTime,
        timezone: e.timezone,
        status: toWaitlistStatus(e.status),
        resolutionCode: toWaitlistResolutionCode(e.resolutionCode),
        resolvedAt: e.resolvedAt ? e.resolvedAt.toISOString() : null,
        resolvedAppointmentId: e.resolvedAppointmentId,
        createdByUserId: e.createdByUserId,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      };
    });

    return {
      entries,
      total: totalRow ? Number(totalRow.val) : 0,
    };
  },

  async getWaitlistEntryById(
    organizationId: string,
    id: string
  ): Promise<WaitlistEntryDTO | null> {
    const rows = await db
      .select({
        entry: appointmentWaitlistEntries,
        patient: {
          birthName: patientProfiles.birthName,
          usedName: patientProfiles.usedName,
          firstBirthName: patientProfiles.firstBirthName,
          usedFirstName: patientProfiles.usedFirstName,
        },
        practitioner: {
          displayName: practicePractitioners.displayName,
        },
        type: {
          name: appointmentTypes.name,
        },
        location: {
          name: practiceLocations.name,
        },
      })
      .from(appointmentWaitlistEntries)
      .innerJoin(
        patientProfiles,
        and(
          eq(appointmentWaitlistEntries.patientId, patientProfiles.id),
          eq(appointmentWaitlistEntries.organizationId, patientProfiles.organizationId)
        )
      )
      .innerJoin(
        appointmentTypes,
        and(
          eq(appointmentWaitlistEntries.appointmentTypeId, appointmentTypes.id),
          eq(appointmentWaitlistEntries.organizationId, appointmentTypes.organizationId)
        )
      )
      .innerJoin(
        practiceLocations,
        and(
          eq(appointmentWaitlistEntries.locationId, practiceLocations.id),
          eq(appointmentWaitlistEntries.organizationId, practiceLocations.organizationId)
        )
      )
      .leftJoin(
        practicePractitioners,
        and(
          eq(appointmentWaitlistEntries.practitionerId, practicePractitioners.id),
          eq(appointmentWaitlistEntries.organizationId, practicePractitioners.organizationId)
        )
      )
      .where(
        and(
          eq(appointmentWaitlistEntries.id, id),
          eq(appointmentWaitlistEntries.organizationId, organizationId)
        )
      )
      .limit(1);

    if (rows.length === 0 || !rows[0]) return null;

    const r = rows[0];
    const e = r.entry;
    const patientName = `${(r.patient.usedName || r.patient.birthName).toUpperCase()} ${
      r.patient.usedFirstName || r.patient.firstBirthName
    }`;

    return {
      id: e.id,
      organizationId: e.organizationId,
      patientId: e.patientId,
      patientName,
      appointmentTypeId: e.appointmentTypeId,
      appointmentTypeName: r.type.name,
      locationId: e.locationId,
      locationName: r.location.name,
      practitionerId: e.practitionerId,
      practitionerName: r.practitioner?.displayName || null,
      preferredDateFrom: e.preferredDateFrom,
      preferredDateUntil: e.preferredDateUntil,
      preferredStartTime: e.preferredStartTime,
      preferredEndTime: e.preferredEndTime,
      timezone: e.timezone,
      status: toWaitlistStatus(e.status),
      resolutionCode: toWaitlistResolutionCode(e.resolutionCode),
      resolvedAt: e.resolvedAt ? e.resolvedAt.toISOString() : null,
      resolvedAppointmentId: e.resolvedAppointmentId,
      createdByUserId: e.createdByUserId,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  },

  async listMatchingWaitlistForAppointment(
    organizationId: string,
    appointmentId: string
  ): Promise<WaitlistMatchDTO[]> {
    // 1. Fetch appointment details
    const appt = await this.getAppointmentById(organizationId, appointmentId);
    if (!appt) {
      throw new AppError('Séance non trouvée', 404, 'NOT_FOUND');
    }

    // 2. Fetch all waiting entries in this organization matching location & appointment type
    const candidateRows = await db
      .select({
        entry: appointmentWaitlistEntries,
        patient: {
          birthName: patientProfiles.birthName,
          usedName: patientProfiles.usedName,
          firstBirthName: patientProfiles.firstBirthName,
          usedFirstName: patientProfiles.usedFirstName,
        },
        practitioner: {
          displayName: practicePractitioners.displayName,
        },
        type: {
          name: appointmentTypes.name,
        },
        location: {
          name: practiceLocations.name,
        },
      })
      .from(appointmentWaitlistEntries)
      .innerJoin(
        patientProfiles,
        and(
          eq(appointmentWaitlistEntries.patientId, patientProfiles.id),
          eq(appointmentWaitlistEntries.organizationId, patientProfiles.organizationId)
        )
      )
      .innerJoin(
        appointmentTypes,
        and(
          eq(appointmentWaitlistEntries.appointmentTypeId, appointmentTypes.id),
          eq(appointmentWaitlistEntries.organizationId, appointmentTypes.organizationId)
        )
      )
      .innerJoin(
        practiceLocations,
        and(
          eq(appointmentWaitlistEntries.locationId, practiceLocations.id),
          eq(appointmentWaitlistEntries.organizationId, practiceLocations.organizationId)
        )
      )
      .leftJoin(
        practicePractitioners,
        and(
          eq(appointmentWaitlistEntries.practitionerId, practicePractitioners.id),
          eq(appointmentWaitlistEntries.organizationId, practicePractitioners.organizationId)
        )
      )
      .where(
        and(
          eq(appointmentWaitlistEntries.organizationId, organizationId),
          eq(appointmentWaitlistEntries.status, 'waiting'),
          eq(appointmentWaitlistEntries.locationId, appt.locationId),
          eq(appointmentWaitlistEntries.appointmentTypeId, appt.appointmentTypeId)
        )
      )
      .orderBy(asc(appointmentWaitlistEntries.createdAt));

    const matches: WaitlistMatchDTO[] = [];
    const apptStartsAt = new Date(appt.startsAt);
    const apptEndsAt = new Date(appt.endsAt);

    for (const r of candidateRows) {
      const e = r.entry;

      // 1. Practitioner check: practitionerId is null (any) OR exact match
      if (e.practitionerId && e.practitionerId !== appt.practitionerId) {
        continue;
      }

      // 2. Timezone conversion: format appointment in the entry's snapshot timezone
      const startLocal = formatUtcToLocal(apptStartsAt, e.timezone);
      const endLocal = formatUtcToLocal(apptEndsAt, e.timezone);

      // 3. Date window check
      if (startLocal.localDate < e.preferredDateFrom) {
        continue;
      }
      if (e.preferredDateUntil && startLocal.localDate > e.preferredDateUntil) {
        continue;
      }

      // 4. Time window check
      if (e.preferredStartTime && e.preferredEndTime) {
        const prefStart = e.preferredStartTime.slice(0, 5);
        const prefEnd = e.preferredEndTime.slice(0, 5);
        if (startLocal.localTime < prefStart || endLocal.localTime > prefEnd) {
          continue;
        }
      }

      // Calculate score
      let score = 50;
      if (e.practitionerId === appt.practitionerId) {
        score += 50; // exact practitioner match
      } else {
        score += 30; // any practitioner acceptable
      }
      if (e.preferredStartTime && e.preferredEndTime) {
        score += 10; // specific time window matched
      }

      const patientName = `${(r.patient.usedName || r.patient.birthName).toUpperCase()} ${
        r.patient.usedFirstName || r.patient.firstBirthName
      }`;

      matches.push({
        waitlistEntry: {
          id: e.id,
          organizationId: e.organizationId,
          patientId: e.patientId,
          patientName,
          appointmentTypeId: e.appointmentTypeId,
          appointmentTypeName: r.type.name,
          locationId: e.locationId,
          locationName: r.location.name,
          practitionerId: e.practitionerId,
          practitionerName: r.practitioner?.displayName || null,
          preferredDateFrom: e.preferredDateFrom,
          preferredDateUntil: e.preferredDateUntil,
          preferredStartTime: e.preferredStartTime,
          preferredEndTime: e.preferredEndTime,
          timezone: e.timezone,
          status: toWaitlistStatus(e.status),
          resolutionCode: toWaitlistResolutionCode(e.resolutionCode),
          resolvedAt: e.resolvedAt ? e.resolvedAt.toISOString() : null,
          resolvedAppointmentId: e.resolvedAppointmentId,
          createdByUserId: e.createdByUserId,
          createdAt: e.createdAt.toISOString(),
          updatedAt: e.updatedAt.toISOString(),
        },
        matchScore: score,
      });
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  },
};

