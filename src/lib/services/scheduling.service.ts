import { db } from '@/lib/db/server';
import {
  appointmentTypes,
  practitionerAvailabilityRules,
  practitionerAvailabilityExceptions,
  appointments,
  patientProfiles,
  practicePractitioners,
  practiceLocations,
  practitionerLocations,
  practiceRooms,
  users,
} from '@/lib/db/schema';
import { eq, and, sql, desc, asc, ilike, or, gte, lte } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { AppError } from '@/lib/errors';
import {
  AppointmentTypeDTO,
  AvailabilityRuleDTO,
  AvailabilityExceptionDTO,
  AppointmentDTO,
  AppointmentCalendarEventDTO,
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

function toAppointmentStatus(_status: string): 'scheduled' {
  return 'scheduled';
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
    const location = loc[0];

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
      const startLocal = formatUtcToLocal(appt.startsAt, location.timezone);
      const endLocal = formatUtcToLocal(appt.endsAt, location.timezone);

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
};
