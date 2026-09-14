import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  grantPatientPortalAccessAction,
  revokePatientPortalAccessAction,
  getPatientPortalOverviewAction,
  getMyPatientAppointmentsAction,
} from '@/app/actions/patient-portal.actions';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientPortalService } from '@/lib/services/patient-portal.service';
import type { PatientPortalAccessDTO, PatientPortalOverviewDTO, PatientPortalAppointmentDTO } from '@/lib/patient-portal/types';

vi.mock('@/lib/clinical/auth', () => ({
  requireClinicalPractitionerContext: vi.fn(),
}));

vi.mock('@/lib/patient-portal/auth', () => ({
  requirePatientPortalAccess: vi.fn(),
}));

vi.mock('@/lib/services/patient-portal.service', () => ({
  patientPortalService: {
    grantPortalAccess: vi.fn(),
    revokePortalAccess: vi.fn(),
    getPatientPortalOverview: vi.fn(),
    getPatientAppointmentsForPortal: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Patient Portal Access Actions', () => {
  const mockPractitionerCtx = {
    userId: 'user-pro-1',
    organizationId: 'org-health-1',
    practitionerId: 'practitioner-1',
    email: 'pro@cabinet.fr',
  };

  const mockPatientCtx = {
    userId: 'user-pat-1',
    organizationId: 'org-health-1',
    patientId: 'pat-1',
    accessiblePatientIds: ['pat-1'],
    accessId: 'access-1',
    email: 'patient@email.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('grantPatientPortalAccessAction', () => {
    it('grants portal access for a valid email under practitioner authority', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPractitionerCtx);
      const mockResult: PatientPortalAccessDTO = {
        id: 'access-1',
        organizationId: mockPractitionerCtx.organizationId,
        patientId: 'pat-1',
        userId: 'user-pat-1',
        invitedEmail: 'patient@email.com',
        representativeId: null,
        status: 'active',
        lastLoginAt: null,
        createdAt: '2026-09-14T20:00:00.000Z',
        updatedAt: '2026-09-14T20:00:00.000Z',
      };
      vi.mocked(patientPortalService.grantPortalAccess).mockResolvedValue(mockResult);

      const res = await grantPatientPortalAccessAction('pat-1', { email: 'patient@email.com' });

      expect(requireClinicalPractitionerContext).toHaveBeenCalled();
      expect(patientPortalService.grantPortalAccess).toHaveBeenCalledWith(
        mockPractitionerCtx.organizationId,
        mockPractitionerCtx.practitionerId,
        mockPractitionerCtx.userId,
        {
          patientId: 'pat-1',
          email: 'patient@email.com',
          representativeId: null,
        },
      );
      expect(res.status).toBe('active');
    });

    it('rejects invalid email inputs', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPractitionerCtx);
      await expect(grantPatientPortalAccessAction('pat-1', { email: 'invalid-email' })).rejects.toThrow();
    });
  });

  describe('revokePatientPortalAccessAction', () => {
    it('revokes access under practitioner authority', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPractitionerCtx);
      const mockRevoked: PatientPortalAccessDTO = {
        id: 'access-1',
        organizationId: mockPractitionerCtx.organizationId,
        patientId: 'pat-1',
        userId: 'user-pat-1',
        invitedEmail: 'patient@email.com',
        representativeId: null,
        status: 'revoked',
        lastLoginAt: null,
        createdAt: '2026-09-14T20:00:00.000Z',
        updatedAt: '2026-09-14T20:00:00.000Z',
      };
      vi.mocked(patientPortalService.revokePortalAccess).mockResolvedValue(mockRevoked);

      const res = await revokePatientPortalAccessAction('pat-1', { accessId: 'access-1' });

      expect(patientPortalService.revokePortalAccess).toHaveBeenCalledWith(
        mockPractitionerCtx.organizationId,
        'access-1',
      );
      expect(res.status).toBe('revoked');
    });
  });

  describe('getPatientPortalOverviewAction', () => {
    it('returns portal overview for authenticated patient', async () => {
      vi.mocked(requirePatientPortalAccess).mockResolvedValue(mockPatientCtx);
      const mockOverview: PatientPortalOverviewDTO = {
        patient: {
          id: 'pat-1',
          usedFirstName: 'Jean',
          firstBirthName: 'Jean',
          usedName: 'Dupont',
          birthName: null,
          birthDate: '1990-01-01',
          email: 'patient@email.com',
          phone: '0600000000',
        },
        organization: {
          id: 'org-health-1',
          name: 'Cabinet Santé',
          phone: null,
          email: null,
          address: null,
          city: null,
          postalCode: null,
        },
        upcomingAppointments: [],
        pendingQuestionnairesCount: 1,
        unreadMessagesCount: 0,
        unpaidInvoicesCount: 1,
      };
      vi.mocked(patientPortalService.getPatientPortalOverview).mockResolvedValue(mockOverview);

      const res = await getPatientPortalOverviewAction();

      expect(requirePatientPortalAccess).toHaveBeenCalled();
      expect(patientPortalService.getPatientPortalOverview).toHaveBeenCalledWith(
        mockPatientCtx.organizationId,
        mockPatientCtx.patientId,
        mockPatientCtx.userId,
      );
      expect(res.pendingQuestionnairesCount).toBe(1);
    });
  });

  describe('getMyPatientAppointmentsAction', () => {
    it('returns safe appointment projections for patient', async () => {
      vi.mocked(requirePatientPortalAccess).mockResolvedValue(mockPatientCtx);
      const mockAppts: PatientPortalAppointmentDTO[] = [
        {
          id: 'apt-1',
          startsAt: '2026-09-20T10:00:00.000Z',
          endsAt: '2026-09-20T10:30:00.000Z',
          status: 'scheduled',
          appointmentTypeName: 'Consultation Bilan',
          practitionerName: 'Dr Martin',
          locationName: 'Cabinet Principal',
          locationAddress: '10 Rue de la Paix',
          roomName: 'Salle 1',
        },
      ];
      vi.mocked(patientPortalService.getPatientAppointmentsForPortal).mockResolvedValue(mockAppts);

      const res = await getMyPatientAppointmentsAction();

      expect(patientPortalService.getPatientAppointmentsForPortal).toHaveBeenCalledWith(
        mockPatientCtx.organizationId,
        mockPatientCtx.patientId,
      );
      expect(res.length).toBe(1);
      expect(res[0].practitionerName).toBe('Dr Martin');
    });
  });
});
