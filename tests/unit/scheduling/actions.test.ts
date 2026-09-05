import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sessionModule from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { schedulingService } from '@/lib/services/scheduling.service';
import {
  listAppointmentTypesAction,
  cancelAppointmentAction,
  markAppointmentNoShowAction,
  createWaitlistEntryAction,
  updateWaitlistEntryAction,
  resolveWaitlistEntryAction,
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
    cancelAppointment: vi.fn(),
    markAppointmentNoShow: vi.fn(),
    createWaitlistEntry: vi.fn(),
    updateWaitlistEntry: vi.fn(),
    resolveWaitlistEntry: vi.fn(),
    listWaitlistEntries: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Scheduling Actions Guard & Authority Tests (Session 10 / 10B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupParamedicalSession = () => {
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
  };

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
    await expect(
      cancelAppointmentAction({ appointmentId: 'appt-1', reasonCode: 'patient_request' })
    ).rejects.toThrow('Cette action est réservée au workspace paramédical');
    await expect(
      createWaitlistEntryAction({
        patientId: 'pat-1',
        locationId: 'loc-1',
        appointmentTypeId: 'type-1',
        preferredDateFrom: '2026-10-01',
      })
    ).rejects.toThrow('Cette action est réservée au workspace paramédical');
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
    await expect(markAppointmentNoShowAction('appt-1')).rejects.toThrow('Organization introuvable');
    expect(schedulingService.listAppointmentTypes).not.toHaveBeenCalled();
    expect(schedulingService.markAppointmentNoShow).not.toHaveBeenCalled();
  });

  it('calls cancelAppointment with session organizationId, userId, and validated reasonCode', async () => {
    setupParamedicalSession();

    vi.mocked(schedulingService.cancelAppointment).mockResolvedValue({
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
      status: 'cancelled',
      cancellationReasonCode: 'patient_request',
      cancelledAt: '2026-09-05T08:00:00.000Z',
      noShowAt: null,
      createdAt: '2026-09-04T00:00:00.000Z',
      updatedAt: '2026-09-05T08:00:00.000Z',
    });

    const payload = {
      appointmentId: 'appt-1',
      reasonCode: 'patient_request' as const,
      // Injected client fields should never be forwarded
      organizationId: 'org-attacker',
      userId: 'user-attacker',
      cancelledAt: '2020-01-01',
    };

    const result = await cancelAppointmentAction(payload);
    expect(result.status).toBe('cancelled');

    expect(schedulingService.cancelAppointment).toHaveBeenCalledWith(
      'org-paramedical',
      'user-pro',
      {
        appointmentId: 'appt-1',
        reasonCode: 'patient_request',
      }
    );
  });

  it('calls markAppointmentNoShow with session organizationId and userId, rejecting client timestamps', async () => {
    setupParamedicalSession();

    vi.mocked(schedulingService.markAppointmentNoShow).mockResolvedValue({
      id: 'appt-1',
      organizationId: 'org-paramedical',
      patientId: 'pat-1',
      practitionerId: 'prac-1',
      appointmentTypeId: 'type-1',
      locationId: 'loc-1',
      roomId: null,
      createdByUserId: 'user-pro',
      startsAt: '2026-09-04T08:00:00.000Z',
      endsAt: '2026-09-04T08:30:00.000Z',
      occupancyStartsAt: '2026-09-04T08:00:00.000Z',
      occupancyEndsAt: '2026-09-04T08:30:00.000Z',
      timezone: 'Europe/Paris',
      status: 'no_show',
      cancellationReasonCode: null,
      cancelledAt: null,
      noShowAt: '2026-09-05T08:00:00.000Z',
      createdAt: '2026-09-04T00:00:00.000Z',
      updatedAt: '2026-09-05T08:00:00.000Z',
    });

    const result = await markAppointmentNoShowAction('appt-1');
    expect(result.status).toBe('no_show');

    expect(schedulingService.markAppointmentNoShow).toHaveBeenCalledWith(
      'org-paramedical',
      'user-pro',
      'appt-1'
    );
  });

  it('calls createWaitlistEntry with session organizationId and userId, ignoring client authority overrides', async () => {
    setupParamedicalSession();

    vi.mocked(schedulingService.createWaitlistEntry).mockResolvedValue({
      id: 'wl-1',
      organizationId: 'org-paramedical',
      patientId: 'pat-1',
      appointmentTypeId: 'type-1',
      locationId: 'loc-1',
      practitionerId: 'prac-1',
      preferredDateFrom: '2026-10-01',
      preferredDateUntil: '2026-10-31',
      preferredStartTime: '09:00:00',
      preferredEndTime: '12:00:00',
      timezone: 'Europe/Paris',
      status: 'waiting',
      resolutionCode: null,
      resolvedAt: null,
      resolvedAppointmentId: null,
      createdByUserId: 'user-pro',
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-09-05T00:00:00.000Z',
    });

    const clientPayload = {
      patientId: 'pat-1',
      locationId: 'loc-1',
      practitionerId: 'prac-1',
      appointmentTypeId: 'type-1',
      preferredDateFrom: '2026-10-01',
      preferredDateUntil: '2026-10-31',
      preferredStartTime: '09:00',
      preferredEndTime: '12:00',
      // Injected malicious values
      organizationId: 'org-malicious',
      createdByUserId: 'user-malicious',
      timezone: 'America/New_York',
      status: 'resolved',
      resolvedAt: '2026-01-01',
    };

    const result = await createWaitlistEntryAction(clientPayload);
    expect(result.id).toBe('wl-1');

    expect(schedulingService.createWaitlistEntry).toHaveBeenCalledWith(
      'org-paramedical',
      'user-pro',
      {
        patientId: 'pat-1',
        locationId: 'loc-1',
        practitionerId: 'prac-1',
        appointmentTypeId: 'type-1',
        preferredDateFrom: '2026-10-01',
        preferredDateUntil: '2026-10-31',
        preferredStartTime: '09:00',
        preferredEndTime: '12:00',
      }
    );
  });

  it('calls updateWaitlistEntry and resolveWaitlistEntry with session organizationId and userId', async () => {
    setupParamedicalSession();

    vi.mocked(schedulingService.updateWaitlistEntry).mockResolvedValue({
      id: 'wl-1',
      organizationId: 'org-paramedical',
      patientId: 'pat-1',
      appointmentTypeId: 'type-1',
      locationId: 'loc-1',
      practitionerId: null,
      preferredDateFrom: '2026-10-05',
      preferredDateUntil: null,
      preferredStartTime: null,
      preferredEndTime: null,
      timezone: 'Europe/Paris',
      status: 'waiting',
      resolutionCode: null,
      resolvedAt: null,
      resolvedAppointmentId: null,
      createdByUserId: 'user-pro',
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-09-05T00:00:00.000Z',
    });

    await updateWaitlistEntryAction({
      id: 'wl-1',
      patientId: 'pat-1',
      locationId: 'loc-1',
      appointmentTypeId: 'type-1',
      preferredDateFrom: '2026-10-05',
    });

    expect(schedulingService.updateWaitlistEntry).toHaveBeenCalledWith(
      'org-paramedical',
      'user-pro',
      expect.objectContaining({ id: 'wl-1', preferredDateFrom: '2026-10-05' })
    );

    vi.mocked(schedulingService.resolveWaitlistEntry).mockResolvedValue({
      id: 'wl-1',
      organizationId: 'org-paramedical',
      patientId: 'pat-1',
      appointmentTypeId: 'type-1',
      locationId: 'loc-1',
      practitionerId: null,
      preferredDateFrom: '2026-10-05',
      preferredDateUntil: null,
      preferredStartTime: null,
      preferredEndTime: null,
      timezone: 'Europe/Paris',
      status: 'resolved',
      resolutionCode: 'withdrawn',
      resolvedAt: '2026-09-05T00:00:00.000Z',
      resolvedAppointmentId: null,
      createdByUserId: 'user-pro',
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-09-05T00:00:00.000Z',
    });

    await resolveWaitlistEntryAction({
      id: 'wl-1',
      resolutionCode: 'withdrawn',
    });

    expect(schedulingService.resolveWaitlistEntry).toHaveBeenCalledWith(
      'org-paramedical',
      'user-pro',
      { id: 'wl-1', resolutionCode: 'withdrawn' }
    );
  });
});
