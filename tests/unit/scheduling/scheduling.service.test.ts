import { describe, it, expect, vi, beforeEach } from 'vitest';
import { schedulingService, isPgConflictError } from '@/lib/services/scheduling.service';
import { db } from '@/lib/db/server';

vi.mock('@/lib/db/server', () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
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

    it('rejects if room does not belong to selected location', async () => {
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
                // Patient check -> active
                return Promise.resolve([{ id: 'pat-1', isActive: true }]);
              }
              if (callCount === 3) {
                // Practitioner check -> active
                return Promise.resolve([{ id: 'prac-1', isActive: true }]);
              }
              if (callCount === 4) {
                // Location check -> active
                return Promise.resolve([{ id: 'loc-1', isActive: true, timezone: 'Europe/Paris' }]);
              }
              if (callCount === 5) {
                // PractitionerLocation check -> active
                return Promise.resolve([{ practitionerId: 'prac-1', locationId: 'loc-1', isActive: true }]);
              }
              if (callCount === 6) {
                // Type check -> active
                return Promise.resolve([
                  {
                    id: 'type-1',
                    isActive: true,
                    durationMinutes: 30,
                    bufferBeforeMinutes: 0,
                    bufferAfterMinutes: 0,
                  },
                ]);
              }
              if (callCount === 7) {
                // Room check -> location mismatch!
                return Promise.resolve([
                  { id: 'room-1', locationId: 'loc-OTHER', isActive: true },
                ]);
              }
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
  });
});
