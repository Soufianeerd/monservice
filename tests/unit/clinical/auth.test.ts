import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireClinicalPractitionerContext, findActiveClinicalPractitioner } from '@/lib/clinical/auth';
import { requireProfessional } from '@/lib/auth/session';
import { db } from '@/lib/db/server';
import { AppError } from '@/lib/errors';

vi.mock('@/lib/auth/session', () => ({
  requireProfessional: vi.fn(),
}));

vi.mock('@/lib/db/server', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('Clinical Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findActiveClinicalPractitioner', () => {
    it('returns practitionerId when an active practitioner is linked to userId', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'practitioner-123' }]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await findActiveClinicalPractitioner('org-123', 'user-123');
      expect(result).toBe('practitioner-123');
    });

    it('returns null when no active practitioner is found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await findActiveClinicalPractitioner('org-123', 'user-unlinked');
      expect(result).toBeNull();
    });
  });

  describe('requireClinicalPractitionerContext', () => {
    it('returns clinical context when user is a professional in paramedical workspace with active practitioner', async () => {
      vi.mocked(requireProfessional).mockResolvedValue({
        userId: 'user-pro-1',
        organizationId: 'org-health-1',
        profileType: 'professional',
        email: 'pro@cabinet.fr',
      });

      const mockSelect = vi.fn();
      // 1st call for organization
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'org-health-1',
                sector: 'health',
                profession: 'physiotherapist',
                country: 'FR',
              },
            ]),
          }),
        }),
      });
      // 2nd call for practice_practitioners
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'practitioner-pro-1' }]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const context = await requireClinicalPractitionerContext();
      expect(context.userId).toBe('user-pro-1');
      expect(context.organizationId).toBe('org-health-1');
      expect(context.practitionerId).toBe('practitioner-pro-1');
      expect(context.email).toBe('pro@cabinet.fr');
    });

    it('throws CLINICAL_ACCESS_FORBIDDEN when professional is not linked to any active practitioner', async () => {
      vi.mocked(requireProfessional).mockResolvedValue({
        userId: 'user-staff-1',
        organizationId: 'org-health-1',
        profileType: 'professional',
        email: 'staff@cabinet.fr',
      });

      const mockSelect = vi.fn();
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'org-health-1',
                sector: 'health',
                profession: 'physiotherapist',
                country: 'FR',
              },
            ]),
          }),
        }),
      });
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(requireClinicalPractitionerContext()).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          code: 'CLINICAL_ACCESS_FORBIDDEN',
        }),
      );
    });

    it('throws CLINICAL_ACCESS_FORBIDDEN when workspace is generic IT or consulting', async () => {
      vi.mocked(requireProfessional).mockResolvedValue({
        userId: 'user-it-1',
        organizationId: 'org-it-1',
        profileType: 'professional',
        email: 'it@company.com',
      });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'org-it-1',
                sector: 'IT',
                profession: null,
                country: 'FR',
              },
            ]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(requireClinicalPractitionerContext()).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          code: 'CLINICAL_ACCESS_FORBIDDEN',
        }),
      );
    });

    it('throws CLINICAL_ACCESS_FORBIDDEN when organization record is not found', async () => {
      vi.mocked(requireProfessional).mockResolvedValue({
        userId: 'user-1',
        organizationId: 'org-missing',
        profileType: 'professional',
        email: 'pro@missing.fr',
      });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(requireClinicalPractitionerContext()).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          code: 'CLINICAL_ACCESS_FORBIDDEN',
        }),
      );
    });

    it('propagates error when requireProfessional rejects (e.g. client profile or unauthenticated)', async () => {
      vi.mocked(requireProfessional).mockRejectedValue(
        new AppError('Accès réservé aux comptes professionnels', 403, 'FORBIDDEN_PROFILE'),
      );

      await expect(requireClinicalPractitionerContext()).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          code: 'FORBIDDEN_PROFILE',
        }),
      );
    });
  });
});
