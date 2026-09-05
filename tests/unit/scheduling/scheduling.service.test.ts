import { describe, it, expect, vi, beforeEach } from 'vitest';
import { schedulingService, isPgConflictError } from '@/lib/services/scheduling.service';
import { db } from '@/lib/db/server';
import { AppError } from '@/lib/errors';

const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockWhere = vi.fn(() => ({ returning: mockReturning }));
const mockSet = vi.fn(() => ({ where: mockWhere }));

vi.mock('@/lib/db/server', () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(() => ({ values: mockValues })),
      update: vi.fn(() => ({ set: mockSet })),
    },
  };
});

describe('Scheduling Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Postgres Conflict Error Mapping', () => {
    it('detects 23P01 code as conflict error', () => {
      expect(isPgConflictError({ code: '23P01' })).toBe(true);
      expect(isPgConflictError({ sqlState: '23P01' })).toBe(true);
      expect(isPgConflictError({ message: 'exclusion constraint violation 23P01' })).toBe(true);
      expect(isPgConflictError({ cause: { code: '23P01' } })).toBe(true);
      expect(isPgConflictError({ code: '23505' })).toBe(false); // unique violation is not 23P01
      expect(isPgConflictError(new Error('Generic network error'))).toBe(false);
    });
  });

  describe('createAppointment active entity & rule guards', () => {
    const validPayload = {
      patientId: 'pat-1',
      practitionerId: 'prac-1',
      appointmentTypeId: 'type-1',
      locationId: 'loc-1',
      roomId: 'room-1',
      localDate: '2026-09-04',
      localStartTime: '10:00',
    };

    it('rejects if created-by user is not professional', async () => {
      // Mock user select
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'user-1', profileType: 'client' }]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.createAppointment('org-1', 'user-1', validPayload)
      ).rejects.toThrow('Créateur non autorisé');
    });

    it('rejects if patient is inactive/archived', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // User check
                return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              }
              if (callCount === 2) {
                // Patient check -> inactive
                return Promise.resolve([{ id: 'pat-1', isActive: false }]);
              }
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.createAppointment('org-1', 'user-1', validPayload)
      ).rejects.toThrow('Le dossier patient est archivé / inactif');
    });

    it('rejects if practitioner is inactive', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) return Promise.resolve([{ id: 'pat-1', isActive: true }]);
              if (callCount === 3) return Promise.resolve([{ id: 'prac-1', isActive: false }]); // Inactive practitioner
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.createAppointment('org-1', 'user-1', validPayload)
      ).rejects.toThrow('Le praticien est inactif');
    });

    it('rejects if location is inactive', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) return Promise.resolve([{ id: 'pat-1', isActive: true }]);
              if (callCount === 3) return Promise.resolve([{ id: 'prac-1', isActive: true }]);
              if (callCount === 4) return Promise.resolve([{ id: 'loc-1', isActive: false, timezone: 'Europe/Paris' }]); // Inactive location
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.createAppointment('org-1', 'user-1', validPayload)
      ).rejects.toThrow('Le lieu de consultation est inactif');
    });

    it('rejects if practitioner-location assignment is inactive', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) return Promise.resolve([{ id: 'pat-1', isActive: true }]);
              if (callCount === 3) return Promise.resolve([{ id: 'prac-1', isActive: true }]);
              if (callCount === 4) return Promise.resolve([{ id: 'loc-1', isActive: true, timezone: 'Europe/Paris' }]);
              if (callCount === 5) return Promise.resolve([{ practitionerId: 'prac-1', locationId: 'loc-1', isActive: false }]); // Inactive assignment
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.createAppointment('org-1', 'user-1', validPayload)
      ).rejects.toThrow("L'affectation du praticien à ce lieu est inactive");
    });

    it('rejects if appointment type is inactive', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) return Promise.resolve([{ id: 'pat-1', isActive: true }]);
              if (callCount === 3) return Promise.resolve([{ id: 'prac-1', isActive: true }]);
              if (callCount === 4) return Promise.resolve([{ id: 'loc-1', isActive: true, timezone: 'Europe/Paris' }]);
              if (callCount === 5) return Promise.resolve([{ practitionerId: 'prac-1', locationId: 'loc-1', isActive: true }]);
              if (callCount === 6) return Promise.resolve([{ id: 'type-1', isActive: false, durationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 }]); // Inactive type
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.createAppointment('org-1', 'user-1', validPayload)
      ).rejects.toThrow('Ce type de séance est inactif');
    });

    it('rejects if room is inactive', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) return Promise.resolve([{ id: 'pat-1', isActive: true }]);
              if (callCount === 3) return Promise.resolve([{ id: 'prac-1', isActive: true }]);
              if (callCount === 4) return Promise.resolve([{ id: 'loc-1', isActive: true, timezone: 'Europe/Paris' }]);
              if (callCount === 5) return Promise.resolve([{ practitionerId: 'prac-1', locationId: 'loc-1', isActive: true }]);
              if (callCount === 6) return Promise.resolve([{ id: 'type-1', isActive: true, durationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 }]);
              if (callCount === 7) return Promise.resolve([{ id: 'room-1', locationId: 'loc-1', isActive: false }]); // Inactive room
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.createAppointment('org-1', 'user-1', validPayload)
      ).rejects.toThrow('La salle sélectionnée est inactive');
    });

    it('rejects if room does not belong to selected location', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) return Promise.resolve([{ id: 'pat-1', isActive: true }]);
              if (callCount === 3) return Promise.resolve([{ id: 'prac-1', isActive: true }]);
              if (callCount === 4) return Promise.resolve([{ id: 'loc-1', isActive: true, timezone: 'Europe/Paris' }]);
              if (callCount === 5) return Promise.resolve([{ practitionerId: 'prac-1', locationId: 'loc-1', isActive: true }]);
              if (callCount === 6) return Promise.resolve([{ id: 'type-1', isActive: true, durationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 }]);
              if (callCount === 7) return Promise.resolve([{ id: 'room-1', locationId: 'loc-OTHER', isActive: true }]);
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.createAppointment('org-1', 'user-1', validPayload)
      ).rejects.toThrow("La salle sélectionnée n'appartient pas au lieu de consultation");
    });

    it('rejects if appointment crosses midnight (overnight)', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) return Promise.resolve([{ id: 'pat-1', isActive: true }]);
              if (callCount === 3) return Promise.resolve([{ id: 'prac-1', isActive: true }]);
              if (callCount === 4) return Promise.resolve([{ id: 'loc-1', isActive: true, timezone: 'Europe/Paris' }]);
              if (callCount === 5) return Promise.resolve([{ practitionerId: 'prac-1', locationId: 'loc-1', isActive: true }]);
              if (callCount === 6) {
                // Type duration 90 minutes
                return Promise.resolve([{ id: 'type-1', isActive: true, durationMinutes: 90, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 }]);
              }
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.createAppointment('org-1', 'user-1', {
          ...validPayload,
          roomId: null,
          localStartTime: '23:30', // 23:30 + 90 min = 01:00 next day (overnight)
        })
      ).rejects.toThrow('Les séances traversant minuit ne sont pas autorisées');
    });

    it('rejects appointment when requested slot is outside practitioner availability (PRACTITIONER_UNAVAILABLE)', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) return Promise.resolve([{ id: 'pat-1', isActive: true }]);
              if (callCount === 3) return Promise.resolve([{ id: 'prac-1', isActive: true }]);
              if (callCount === 4) return Promise.resolve([{ id: 'loc-1', isActive: true, timezone: 'Europe/Paris' }]);
              if (callCount === 5) return Promise.resolve([{ practitionerId: 'prac-1', locationId: 'loc-1', isActive: true }]);
              if (callCount === 6) return Promise.resolve([{ id: 'type-1', isActive: true, durationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 }]);
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      vi.spyOn(schedulingService, 'listAvailabilityRules').mockResolvedValue([]);
      vi.spyOn(schedulingService, 'listAvailabilityExceptions').mockResolvedValue([]);

      try {
        await schedulingService.createAppointment('org-1', 'user-1', {
          ...validPayload,
          roomId: null,
          localStartTime: '10:00',
        });
        expect.unreachable('Should have thrown PRACTITIONER_UNAVAILABLE');
      } catch (err: unknown) {
        if (!(err instanceof AppError)) {
          expect.unreachable('Expected error to be an instance of AppError');
        }
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('PRACTITIONER_UNAVAILABLE');
        expect(err.message).toBe("Le créneau demandé n'est pas couvert par les disponibilités du praticien");
      }
    });

    it('maps 23P01 DB exclusion violation error to 409 SCHEDULING_CONFLICT in createAppointment', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) return Promise.resolve([{ id: 'pat-1', isActive: true }]);
              if (callCount === 3) return Promise.resolve([{ id: 'prac-1', isActive: true }]);
              if (callCount === 4) return Promise.resolve([{ id: 'loc-1', isActive: true, timezone: 'Europe/Paris' }]);
              if (callCount === 5) return Promise.resolve([{ practitionerId: 'prac-1', locationId: 'loc-1', isActive: true }]);
              if (callCount === 6) return Promise.resolve([{ id: 'type-1', isActive: true, durationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 }]);
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      vi.spyOn(schedulingService, 'listAvailabilityRules').mockResolvedValue([
        {
          id: 'rule-1',
          organizationId: 'org-1',
          practitionerId: 'prac-1',
          locationId: 'loc-1',
          weekday: 5, // Friday
          startTime: '08:00',
          endTime: '18:00',
          validFrom: '2026-01-01',
          validUntil: null,
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ]);
      vi.spyOn(schedulingService, 'listAvailabilityExceptions').mockResolvedValue([]);

      // Simulate 23P01 error on insert
      const pgConflict = Object.assign(new Error('conflicting key value violates exclusion constraint'), {
        code: '23P01',
      });
      mockReturning.mockRejectedValueOnce(pgConflict);

      try {
        await schedulingService.createAppointment('org-1', 'user-1', {
          ...validPayload,
          roomId: null,
        });
        expect.unreachable('Should have thrown 409 conflict');
      } catch (err: unknown) {
        if (!(err instanceof AppError)) {
          expect.unreachable('Expected error to be an instance of AppError');
        }
        expect(err.statusCode).toBe(409);
        expect(err.code).toBe('SCHEDULING_CONFLICT');
      }
    });

    it('maps 23P01 DB exclusion violation error to 409 SCHEDULING_CONFLICT in rescheduleAppointment', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // Existing appointment check
                return Promise.resolve([
                  {
                    id: 'appt-1',
                    organizationId: 'org-1',
                    patientId: 'pat-1',
                    practitionerId: 'prac-1',
                    appointmentTypeId: 'type-1',
                    locationId: 'loc-1',
                    roomId: null,
                    timezone: 'Europe/Paris',
                    status: 'scheduled',
                  },
                ]);
              }
              if (callCount === 2) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]); // Creator
              if (callCount === 3) return Promise.resolve([{ id: 'pat-1', isActive: true }]);
              if (callCount === 4) return Promise.resolve([{ id: 'prac-1', isActive: true }]);
              if (callCount === 5) return Promise.resolve([{ id: 'loc-1', isActive: true, timezone: 'Europe/Paris' }]);
              if (callCount === 6) return Promise.resolve([{ practitionerId: 'prac-1', locationId: 'loc-1', isActive: true }]);
              if (callCount === 7) return Promise.resolve([{ id: 'type-1', isActive: true, durationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 }]);
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      vi.spyOn(schedulingService, 'listAvailabilityRules').mockResolvedValue([
        {
          id: 'rule-1',
          organizationId: 'org-1',
          practitionerId: 'prac-1',
          locationId: 'loc-1',
          weekday: 5,
          startTime: '08:00',
          endTime: '18:00',
          validFrom: '2026-01-01',
          validUntil: null,
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ]);
      vi.spyOn(schedulingService, 'listAvailabilityExceptions').mockResolvedValue([]);

      const pgConflict = Object.assign(new Error('exclusion violation 23P01'), {
        code: '23P01',
      });
      mockReturning.mockRejectedValueOnce(pgConflict);

      try {
        await schedulingService.rescheduleAppointment('org-1', 'user-1', {
          appointmentId: 'appt-1',
          patientId: 'pat-1',
          practitionerId: 'prac-1',
          appointmentTypeId: 'type-1',
          locationId: 'loc-1',
          roomId: null,
          localDate: '2026-09-04',
          localStartTime: '10:00',
        });
        expect.unreachable('Should have thrown 409 conflict');
      } catch (err: unknown) {
        if (!(err instanceof AppError)) {
          expect.unreachable('Expected error to be an instance of AppError');
        }
        expect(err.statusCode).toBe(409);
        expect(err.code).toBe('SCHEDULING_CONFLICT');
      }
    });

    it('rejects rescheduling terminal cancelled appointment', async () => {
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'appt-1',
                organizationId: 'org-1',
                patientId: 'pat-1',
                practitionerId: 'prac-1',
                appointmentTypeId: 'type-1',
                locationId: 'loc-1',
                roomId: null,
                timezone: 'Europe/Paris',
                status: 'cancelled',
              },
            ]),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.rescheduleAppointment('org-1', 'user-1', {
          appointmentId: 'appt-1',
          patientId: 'pat-1',
          practitionerId: 'prac-1',
          appointmentTypeId: 'type-1',
          locationId: 'loc-1',
          roomId: null,
          localDate: '2026-09-04',
          localStartTime: '10:00',
        })
      ).rejects.toThrow('Impossible de replanifier une séance non planifiée');
    });
  });

  describe('cancelAppointment & markAppointmentNoShow', () => {
    it('cancelAppointment rejects if appointment not found', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) return Promise.resolve([]);
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.cancelAppointment('org-1', 'user-1', {
          appointmentId: 'non-existent',
          reasonCode: 'patient_request',
        })
      ).rejects.toThrow('Séance non trouvée');
    });

    it('cancelAppointment rejects if already cancelled', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) {
                return Promise.resolve([
                  {
                    id: 'appt-1',
                    organizationId: 'org-1',
                    status: 'cancelled',
                  },
                ]);
              }
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.cancelAppointment('org-1', 'user-1', {
          appointmentId: 'appt-1',
          reasonCode: 'patient_request',
        })
      ).rejects.toThrow('Seules les séances planifiées peuvent être annulées');
    });

    it('cancelAppointment successfully updates status to cancelled', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) {
                return Promise.resolve([
                  {
                    id: 'appt-1',
                    organizationId: 'org-1',
                    status: 'scheduled',
                  },
                ]);
              }
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      const updatedRow = {
        id: 'appt-1',
        organizationId: 'org-1',
        patientId: 'pat-1',
        practitionerId: 'prac-1',
        appointmentTypeId: 'type-1',
        locationId: 'loc-1',
        roomId: null,
        createdByUserId: 'user-1',
        startsAt: new Date('2026-09-04T10:00:00Z'),
        endsAt: new Date('2026-09-04T10:30:00Z'),
        occupancyStartsAt: new Date('2026-09-04T10:00:00Z'),
        occupancyEndsAt: new Date('2026-09-04T10:30:00Z'),
        timezone: 'Europe/Paris',
        status: 'cancelled',
        cancellationReasonCode: 'patient_request',
        cancelledAt: new Date('2026-09-04T09:00:00Z'),
        noShowAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReturning.mockResolvedValueOnce([updatedRow]);

      const result = await schedulingService.cancelAppointment('org-1', 'user-1', {
        appointmentId: 'appt-1',
        reasonCode: 'patient_request',
      });

      expect(result.status).toBe('cancelled');
      expect(result.cancellationReasonCode).toBe('patient_request');
    });

    it('markAppointmentNoShow rejects future appointment (starts_at > now)', async () => {
      let callCount = 0;
      const futureStartsAt = new Date(Date.now() + 86400000); // Tomorrow
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) {
                return Promise.resolve([
                  {
                    id: 'appt-1',
                    organizationId: 'org-1',
                    status: 'scheduled',
                    startsAt: futureStartsAt,
                  },
                ]);
              }
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.markAppointmentNoShow('org-1', 'user-1', 'appt-1')
      ).rejects.toThrow('Impossible de marquer absent pour une séance future');
    });

    it('markAppointmentNoShow succeeds for past or current appointment', async () => {
      let callCount = 0;
      const pastStartsAt = new Date(Date.now() - 3600000); // 1 hour ago
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) {
                return Promise.resolve([
                  {
                    id: 'appt-1',
                    organizationId: 'org-1',
                    status: 'scheduled',
                    startsAt: pastStartsAt,
                  },
                ]);
              }
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      const updatedRow = {
        id: 'appt-1',
        organizationId: 'org-1',
        patientId: 'pat-1',
        practitionerId: 'prac-1',
        appointmentTypeId: 'type-1',
        locationId: 'loc-1',
        roomId: null,
        createdByUserId: 'user-1',
        startsAt: pastStartsAt,
        endsAt: new Date(pastStartsAt.getTime() + 1800000),
        occupancyStartsAt: pastStartsAt,
        occupancyEndsAt: new Date(pastStartsAt.getTime() + 1800000),
        timezone: 'Europe/Paris',
        status: 'no_show',
        cancellationReasonCode: null,
        cancelledAt: null,
        noShowAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReturning.mockResolvedValueOnce([updatedRow]);

      const result = await schedulingService.markAppointmentNoShow('org-1', 'user-1', 'appt-1');
      expect(result.status).toBe('no_show');
      expect(result.noShowAt).not.toBeNull();
    });
  });

  describe('Waitlist Operations', () => {
    it('createWaitlistEntry rejects invalid date interval (latest < earliest)', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) return Promise.resolve([{ id: 'pat-1', isActive: true }]);
              if (callCount === 3) return Promise.resolve([{ id: 'loc-1', isActive: true, timezone: 'Europe/Paris' }]);
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.createWaitlistEntry('org-1', 'user-1', {
          patientId: 'pat-1',
          locationId: 'loc-1',
          appointmentTypeId: 'type-1',
          preferredDateFrom: '2026-10-15',
          preferredDateUntil: '2026-10-10',
        })
      ).rejects.toThrow('La date de fin de préférence doit être postérieure ou égale à la date de début');
    });

    it('updateWaitlistEntry rejects if entry is resolved', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) {
                return Promise.resolve([
                  {
                    id: 'wl-1',
                    organizationId: 'org-1',
                    status: 'resolved',
                  },
                ]);
              }
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.updateWaitlistEntry('org-1', 'user-1', {
          id: 'wl-1',
          patientId: 'pat-1',
          locationId: 'loc-1',
          appointmentTypeId: 'type-1',
          preferredDateFrom: '2026-10-01',
        })
      ).rejects.toThrow('Seules les demandes en attente peuvent être modifiées');
    });

    it('resolveWaitlistEntry rejects if already resolved', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: 'user-1', profileType: 'professional' }]);
              if (callCount === 2) {
                return Promise.resolve([
                  {
                    id: 'wl-1',
                    organizationId: 'org-1',
                    status: 'resolved',
                  },
                ]);
              }
              return Promise.resolve([]);
            }),
          }),
        }),
      }));
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        schedulingService.resolveWaitlistEntry('org-1', 'user-1', {
          id: 'wl-1',
          resolutionCode: 'withdrawn',
        })
      ).rejects.toThrow('Cette demande est déjà résolue');
    });

    it('listMatchingWaitlistForAppointment scores and filters matching waitlist candidates', async () => {
      const apptStartsAt = new Date('2026-10-05T09:00:00.000Z'); // Monday 11:00 CEST (Europe/Paris)
      const apptEndsAt = new Date('2026-10-05T09:30:00.000Z');

      const mockGetAppt = vi.spyOn(schedulingService, 'getAppointmentById').mockResolvedValueOnce({
        id: 'appt-1',
        organizationId: 'org-1',
        patientId: 'pat-x',
        patientName: 'Patient X',
        practitionerId: 'prac-1',
        practitionerName: 'Dr Martin',
        appointmentTypeId: 'type-1',
        appointmentTypeName: 'Kiné',
        locationId: 'loc-1',
        locationName: 'Cabinet Paris',
        roomId: null,
        roomName: null,
        createdByUserId: 'user-1',
        startsAt: apptStartsAt.toISOString(),
        endsAt: apptEndsAt.toISOString(),
        occupancyStartsAt: apptStartsAt.toISOString(),
        occupancyEndsAt: apptEndsAt.toISOString(),
        timezone: 'Europe/Paris',
        status: 'scheduled',
        cancellationReasonCode: null,
        cancelledAt: null,
        noShowAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const candidateRows = [
        {
          entry: {
            id: 'wl-match-exact',
            organizationId: 'org-1',
            patientId: 'pat-1',
            locationId: 'loc-1',
            practitionerId: 'prac-1',
            appointmentTypeId: 'type-1',
            status: 'waiting' as const,
            preferredDateFrom: '2026-10-01',
            preferredDateUntil: '2026-10-31',
            preferredStartTime: '10:00:00',
            preferredEndTime: '12:00:00',
            timezone: 'Europe/Paris',
            resolutionCode: null,
            resolvedAt: null,
            resolvedAppointmentId: null,
            createdByUserId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          patient: {
            birthName: 'DUPONT',
            usedName: 'DUPONT',
            firstBirthName: 'Alice',
            usedFirstName: 'Alice',
          },
          practitioner: {
            displayName: 'Dr Martin',
          },
          type: {
            name: 'Kiné',
          },
          location: {
            name: 'Cabinet Paris',
          },
        },
        {
          entry: {
            id: 'wl-match-any-prac',
            organizationId: 'org-1',
            patientId: 'pat-2',
            locationId: 'loc-1',
            practitionerId: null,
            appointmentTypeId: 'type-1',
            status: 'waiting' as const,
            preferredDateFrom: '2026-10-01',
            preferredDateUntil: null,
            preferredStartTime: null,
            preferredEndTime: null,
            timezone: 'Europe/Paris',
            resolutionCode: null,
            resolvedAt: null,
            resolvedAppointmentId: null,
            createdByUserId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          patient: {
            birthName: 'DURAND',
            usedName: 'DURAND',
            firstBirthName: 'Bob',
            usedFirstName: 'Bob',
          },
          practitioner: null,
          type: {
            name: 'Kiné',
          },
          location: {
            name: 'Cabinet Paris',
          },
        },
        {
          entry: {
            id: 'wl-mismatch-date',
            organizationId: 'org-1',
            patientId: 'pat-3',
            locationId: 'loc-1',
            practitionerId: 'prac-1',
            appointmentTypeId: 'type-1',
            status: 'waiting' as const,
            preferredDateFrom: '2026-11-01',
            preferredDateUntil: '2026-11-30',
            preferredStartTime: null,
            preferredEndTime: null,
            timezone: 'Europe/Paris',
            resolutionCode: null,
            resolvedAt: null,
            resolvedAppointmentId: null,
            createdByUserId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          patient: {
            birthName: 'MARTIN',
            usedName: 'MARTIN',
            firstBirthName: 'Charlie',
            usedFirstName: 'Charlie',
          },
          practitioner: {
            displayName: 'Dr Martin',
          },
          type: {
            name: 'Kiné',
          },
          location: {
            name: 'Cabinet Paris',
          },
        },
      ];

      const queryBuilder = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(candidateRows),
      };
      const mockSelect = vi.fn().mockReturnValue(queryBuilder);
      vi.mocked(db.select).mockImplementation(mockSelect);

      const matches = await schedulingService.listMatchingWaitlistForAppointment('org-1', 'appt-1');
      expect(matches).toHaveLength(2);
      expect(matches[0]?.waitlistEntry.id).toBe('wl-match-exact');
      expect(matches[0]?.matchScore).toBeGreaterThan(matches[1]?.matchScore ?? 0);
      expect(matches[1]?.waitlistEntry.id).toBe('wl-match-any-prac');

      mockGetAppt.mockRestore();
    });
  });
});
