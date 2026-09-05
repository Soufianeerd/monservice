import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sessionModule from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { schedulingService } from '@/lib/services/scheduling.service';
import {
  createAppointmentAction,
  listAppointmentTypesAction,
} from '@/app/actions/scheduling.actions';

vi.mock('@/lib/auth/session', () => ({
  requireProfessional: vi.fn(),
}));

vi.mock('@/lib/services/organization.service', () => ({
  organizationService: {
    getById: vi.fn(),
  },
}));

vi.mock('@/lib/services/scheduling.service', () => ({
  schedulingService: {
    createAppointment: vi.fn(),
    listAppointmentTypes: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Scheduling Actions Guard Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects action if caller is in a Generic workspace', async () => {
    vi.mocked(sessionModule.requireProfessional).mockResolvedValue({
      userId: 'user-1',
      organizationId: 'org-generic',
      email: 'user@test.fr',
      profileType: 'professional',
    });

    vi.mocked(organizationService.getById).mockResolvedValue({
      id: 'org-generic',
      name: 'Generic Business',
      slug: 'generic-biz',
      sector: 'general',
      profession: null,
      industry: 'services',
      isPublic: true,
      country: 'FR',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    });

    await expect(listAppointmentTypesAction()).rejects.toThrow(
      'Cette action est réservée au workspace paramédical'
    );
  });

  it('rejects action if organization is not found in database', async () => {
    vi.mocked(sessionModule.requireProfessional).mockResolvedValue({
      userId: 'user-1',
      organizationId: 'org-missing',
      email: 'user@test.fr',
      profileType: 'professional',
    });

    vi.mocked(organizationService.getById).mockResolvedValue(null);

    await expect(listAppointmentTypesAction()).rejects.toThrow('Organization introuvable');
    expect(schedulingService.listAppointmentTypes).not.toHaveBeenCalled();
  });

  it('rejects action if organizationId is missing', async () => {
    vi.mocked(sessionModule.requireProfessional).mockResolvedValue({
      userId: 'user-1',
      organizationId: '',
      email: 'user@test.fr',
      profileType: 'professional',
    });

    await expect(listAppointmentTypesAction()).rejects.toThrow('Organization introuvable');
  });

  it('calls schedulingService with session organizationId and userId for paramedical workspace', async () => {
    vi.mocked(sessionModule.requireProfessional).mockResolvedValue({
      userId: 'user-pro',
      organizationId: 'org-paramedical',
      email: 'user@test.fr',
      profileType: 'professional',
    });

    vi.mocked(organizationService.getById).mockResolvedValue({
      id: 'org-paramedical',
      name: 'Cabinet Kiné',
      slug: 'cabinet-kine',
      sector: 'health',
      profession: 'physiotherapist',
      industry: 'health',
      isPublic: true,
      country: 'FR',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    });

    vi.mocked(schedulingService.createAppointment).mockResolvedValue({
      id: 'appt-1',
      organizationId: 'org-paramedical',
      patientId: 'pat-1',
      practitionerId: 'prac-1',
      appointmentTypeId: 'type-1',
      locationId: 'loc-1',
      roomId: null,
      createdByUserId: 'user-pro',
      startsAt: '2026-09-10T08:00:00.000Z',
      endsAt: '2026-09-10T08:30:00.000Z',
      occupancyStartsAt: '2026-09-10T08:00:00.000Z',
      occupancyEndsAt: '2026-09-10T08:30:00.000Z',
      timezone: 'Europe/Paris',
      status: 'scheduled',
      cancellationReasonCode: null,
      cancelledAt: null,
      noShowAt: null,
      createdAt: '2026-09-04T00:00:00.000Z',
      updatedAt: '2026-09-04T00:00:00.000Z',
    });

    const payload = {
      patientId: 'pat-1',
      practitionerId: 'prac-1',
      appointmentTypeId: 'type-1',
      locationId: 'loc-1',
      localDate: '2026-09-10',
      localStartTime: '10:00',
    };

    const result = await createAppointmentAction(payload);
    expect(result.id).toBe('appt-1');

    // Verify service was called with org and user from session, NOT client payload
    expect(schedulingService.createAppointment).toHaveBeenCalledWith(
      'org-paramedical',
      'user-pro',
      expect.objectContaining({
        patientId: 'pat-1',
        practitionerId: 'prac-1',
      })
    );
  });
});
