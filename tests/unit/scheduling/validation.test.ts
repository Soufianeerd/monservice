import { describe, it, expect } from 'vitest';
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

describe('Scheduling Validation Schemas', () => {
  describe('appointmentTypeCreateSchema', () => {
    it('accepts valid appointment type input', () => {
      const input = {
        name: 'Bilan initial kinésithérapie',
        description: 'Première séance d’évaluation',
        durationMinutes: 45,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 10,
        slotStepMinutes: 15,
      };
      const result = appointmentTypeCreateSchema.parse(input);
      expect(result.name).toBe('Bilan initial kinésithérapie');
      expect(result.durationMinutes).toBe(45);
      expect(result.bufferBeforeMinutes).toBe(5);
      expect(result.bufferAfterMinutes).toBe(10);
      expect(result.slotStepMinutes).toBe(15);
    });

    it('rejects duration < 5 or > 480', () => {
      expect(() =>
        appointmentTypeCreateSchema.parse({
          name: 'Séance',
          durationMinutes: 4,
        })
      ).toThrow();

      expect(() =>
        appointmentTypeCreateSchema.parse({
          name: 'Séance',
          durationMinutes: 481,
        })
      ).toThrow();
    });

    it('rejects negative buffers or buffers > 240', () => {
      expect(() =>
        appointmentTypeCreateSchema.parse({
          name: 'Séance',
          durationMinutes: 30,
          bufferBeforeMinutes: -1,
        })
      ).toThrow();

      expect(() =>
        appointmentTypeCreateSchema.parse({
          name: 'Séance',
          durationMinutes: 30,
          bufferAfterMinutes: 241,
        })
      ).toThrow();
    });

    it('rejects slotStepMinutes < 5 or > 120', () => {
      expect(() =>
        appointmentTypeCreateSchema.parse({
          name: 'Séance',
          durationMinutes: 30,
          slotStepMinutes: 4,
        })
      ).toThrow();

      expect(() =>
        appointmentTypeCreateSchema.parse({
          name: 'Séance',
          durationMinutes: 30,
          slotStepMinutes: 121,
        })
      ).toThrow();
    });
  });

  describe('availabilityRuleCreateSchema', () => {
    it('accepts valid availability rule', () => {
      const input = {
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        weekday: 1, // Lundi
        startTime: '09:00',
        endTime: '17:00',
        validFrom: '2026-09-01',
        validUntil: '2026-12-31',
      };
      const result = availabilityRuleCreateSchema.parse(input);
      expect(result.weekday).toBe(1);
      expect(result.startTime).toBe('09:00');
    });

    it('rejects weekday outside 0-6', () => {
      expect(() =>
        availabilityRuleCreateSchema.parse({
          practitionerId: 'prac-1',
          locationId: 'loc-1',
          weekday: 7,
          startTime: '09:00',
          endTime: '17:00',
          validFrom: '2026-09-01',
        })
      ).toThrow();
    });

    it('rejects startTime >= endTime', () => {
      expect(() =>
        availabilityRuleCreateSchema.parse({
          practitionerId: 'prac-1',
          locationId: 'loc-1',
          weekday: 1,
          startTime: '17:00',
          endTime: '09:00',
          validFrom: '2026-09-01',
        })
      ).toThrow();

      expect(() =>
        availabilityRuleCreateSchema.parse({
          practitionerId: 'prac-1',
          locationId: 'loc-1',
          weekday: 1,
          startTime: '12:00',
          endTime: '12:00',
          validFrom: '2026-09-01',
        })
      ).toThrow();
    });

    it('rejects validUntil < validFrom', () => {
      expect(() =>
        availabilityRuleCreateSchema.parse({
          practitionerId: 'prac-1',
          locationId: 'loc-1',
          weekday: 1,
          startTime: '09:00',
          endTime: '17:00',
          validFrom: '2026-09-10',
          validUntil: '2026-09-05',
        })
      ).toThrow();
    });
  });

  describe('availabilityExceptionCreateSchema', () => {
    it('accepts full-day exception (both start/end null/undefined)', () => {
      const input = {
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        localDate: '2026-09-15',
        kind: 'closed',
      };
      const result = availabilityExceptionCreateSchema.parse(input);
      expect(result.kind).toBe('closed');
      expect(result.startTime).toBeUndefined();
    });

    it('accepts partial-day exception (start < end)', () => {
      const input = {
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        localDate: '2026-09-15',
        kind: 'open',
        startTime: '14:00',
        endTime: '18:00',
      };
      const result = availabilityExceptionCreateSchema.parse(input);
      expect(result.kind).toBe('open');
      expect(result.startTime).toBe('14:00');
      expect(result.endTime).toBe('18:00');
    });

    it('rejects single time defined', () => {
      expect(() =>
        availabilityExceptionCreateSchema.parse({
          practitionerId: 'prac-1',
          locationId: 'loc-1',
          localDate: '2026-09-15',
          kind: 'closed',
          startTime: '09:00',
        })
      ).toThrow();
    });

    it('rejects invalid exception kind', () => {
      expect(() =>
        availabilityExceptionCreateSchema.parse({
          practitionerId: 'prac-1',
          locationId: 'loc-1',
          localDate: '2026-09-15',
          kind: 'holiday',
        })
      ).toThrow();
    });
  });

  describe('appointmentCreateSchema & appointmentRescheduleSchema', () => {
    it('accepts valid appointment creation input', () => {
      const input = {
        patientId: 'pat-1',
        practitionerId: 'prac-1',
        appointmentTypeId: 'type-1',
        locationId: 'loc-1',
        roomId: 'room-1',
        localDate: '2026-09-10',
        localStartTime: '10:30',
      };
      const result = appointmentCreateSchema.parse(input);
      expect(result.patientId).toBe('pat-1');
      expect(result.localDate).toBe('2026-09-10');
      expect(result.localStartTime).toBe('10:30');
    });

    it('rejects invalid date or time format', () => {
      expect(() =>
        appointmentCreateSchema.parse({
          patientId: 'pat-1',
          practitionerId: 'prac-1',
          appointmentTypeId: 'type-1',
          locationId: 'loc-1',
          localDate: '10-09-2026', // wrong format
          localStartTime: '10:30',
        })
      ).toThrow();

      expect(() =>
        appointmentCreateSchema.parse({
          patientId: 'pat-1',
          practitionerId: 'prac-1',
          appointmentTypeId: 'type-1',
          locationId: 'loc-1',
          localDate: '2026-09-10',
          localStartTime: '25:70', // invalid time
        })
      ).toThrow();
    });

    it('requires appointmentId on reschedule schema', () => {
      expect(() =>
        appointmentRescheduleSchema.parse({
          patientId: 'pat-1',
          practitionerId: 'prac-1',
          appointmentTypeId: 'type-1',
          locationId: 'loc-1',
          localDate: '2026-09-10',
          localStartTime: '10:30',
        })
      ).toThrow();

      const valid = appointmentRescheduleSchema.parse({
        appointmentId: 'appt-123',
        patientId: 'pat-1',
        practitionerId: 'prac-1',
        appointmentTypeId: 'type-1',
        locationId: 'loc-1',
        localDate: '2026-09-10',
        localStartTime: '10:30',
      });
      expect(valid.appointmentId).toBe('appt-123');
    });
  });

  describe('appointmentCalendarRangeSchema', () => {
    it('accepts valid range <= 93 days', () => {
      const result = appointmentCalendarRangeSchema.parse({
        locationId: 'loc-1',
        startDate: '2026-09-01',
        endDate: '2026-10-31',
      });
      expect(result.startDate).toBe('2026-09-01');
    });

    it('rejects startDate > endDate', () => {
      expect(() =>
        appointmentCalendarRangeSchema.parse({
          locationId: 'loc-1',
          startDate: '2026-10-31',
          endDate: '2026-09-01',
        })
      ).toThrow();
    });

    it('rejects range > 93 days', () => {
      expect(() =>
        appointmentCalendarRangeSchema.parse({
          locationId: 'loc-1',
          startDate: '2026-01-01',
          endDate: '2026-06-01', // ~150 days
        })
      ).toThrow();
    });
  });

  describe('Update schemas & Patient Search schema', () => {
    it('validates appointmentTypeUpdateSchema', () => {
      const valid = appointmentTypeUpdateSchema.parse({
        id: 'type-1',
        name: 'Bilan Révisé',
        durationMinutes: 40,
      });
      expect(valid.id).toBe('type-1');
      expect(valid.name).toBe('Bilan Révisé');
    });

    it('validates availabilityRuleUpdateSchema', () => {
      const valid = availabilityRuleUpdateSchema.parse({
        id: 'rule-1',
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        weekday: 2,
        startTime: '08:00',
        endTime: '16:00',
        validFrom: '2026-09-01',
      });
      expect(valid.id).toBe('rule-1');
      expect(valid.weekday).toBe(2);
    });

    it('validates availabilityExceptionUpdateSchema', () => {
      const valid = availabilityExceptionUpdateSchema.parse({
        id: 'exc-1',
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        localDate: '2026-09-20',
        kind: 'closed',
      });
      expect(valid.id).toBe('exc-1');
      expect(valid.kind).toBe('closed');
    });

    it('validates patientSearchSchema', () => {
      const valid = patientSearchSchema.parse({
        query: 'Dupont',
        limit: 15,
      });
      expect(valid.query).toBe('Dupont');
      expect(valid.limit).toBe(15);
    });
  });
});
