import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendPatientPortalMessageAction,
  sendPractitionerPatientMessageAction,
  listPatientPortalMessagesAction,
  listPractitionerPatientMessagesAction,
  markPatientMessagesAsReadAction,
} from '@/app/actions/patient-messaging.actions';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientMessagingService } from '@/lib/services/patient-messaging.service';
import type { PatientPortalMessageDTO } from '@/lib/patient-messaging/types';
import type { PatientPortalUserContext } from '@/lib/patient-portal/auth';

vi.mock('@/lib/clinical/auth', () => ({
  requireClinicalPractitionerContext: vi.fn(),
}));

vi.mock('@/lib/patient-portal/auth', () => ({
  requirePatientPortalAccess: vi.fn(),
}));

vi.mock('@/lib/services/patient-messaging.service', () => ({
  patientMessagingService: {
    sendPatientMessage: vi.fn(),
    sendPractitionerMessage: vi.fn(),
    listPatientMessagesForPortal: vi.fn(),
    listPatientMessagesForPractitioner: vi.fn(),
    markMessagesAsRead: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Patient Messaging Actions', () => {
  const mockPractitionerCtx = {
    userId: 'user-pro-1',
    organizationId: 'org-health-1',
    practitionerId: 'practitioner-1',
    email: 'pro@cabinet.fr',
  };

  const mockPatientCtx: PatientPortalUserContext = {
    userId: 'user-pat-1',
    organizationId: 'org-health-1',
    patientId: 'pat-1',
    accessType: 'patient',
    representativeId: null,
    accessiblePatientIds: ['pat-1'],
    email: 'patient@email.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendPatientPortalMessageAction', () => {
    it('patient sends message to practitioner within active care context', async () => {
      vi.mocked(requirePatientPortalAccess).mockResolvedValue(mockPatientCtx);
      const mockMsg: PatientPortalMessageDTO = {
        id: 'msg-1',
        organizationId: mockPatientCtx.organizationId,
        patientId: mockPatientCtx.patientId,
        senderId: mockPatientCtx.userId,
        receiverId: 'user-pro-1',
        senderName: 'Jean Dupont',
        senderRole: 'patient',
        content: 'Bonjour, dois-je continuer les exercices ?',
        isRead: false,
        createdAt: '2026-09-14T20:00:00.000Z',
      };
      vi.mocked(patientMessagingService.sendPatientMessage).mockResolvedValue(mockMsg);

      const res = await sendPatientPortalMessageAction('pat-1', 'practitioner-1', 'Bonjour, dois-je continuer les exercices ?');

      expect(patientMessagingService.sendPatientMessage).toHaveBeenCalledWith(
        mockPatientCtx.userId,
        {
          patientId: mockPatientCtx.patientId,
          practitionerId: 'practitioner-1',
          content: 'Bonjour, dois-je continuer les exercices ?',
        },
      );
      expect(res.senderRole).toBe('patient');
    });
  });

  describe('sendPractitionerPatientMessageAction', () => {
    it('practitioner replies to patient with practitioner context', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPractitionerCtx);
      const mockMsg: PatientPortalMessageDTO = {
        id: 'msg-2',
        organizationId: mockPractitionerCtx.organizationId,
        patientId: 'pat-1',
        senderId: mockPractitionerCtx.userId,
        receiverId: 'user-pat-1',
        senderName: 'Dr Martin',
        senderRole: 'practitioner',
        content: 'Oui, continuez à un rythme modéré.',
        isRead: false,
        createdAt: '2026-09-14T20:05:00.000Z',
      };
      vi.mocked(patientMessagingService.sendPractitionerMessage).mockResolvedValue(mockMsg);

      const res = await sendPractitionerPatientMessageAction('pat-1', 'user-pat-1', 'Oui, continuez à un rythme modéré.');

      expect(patientMessagingService.sendPractitionerMessage).toHaveBeenCalledWith(
        mockPractitionerCtx.organizationId,
        mockPractitionerCtx.practitionerId,
        mockPractitionerCtx.userId,
        {
          patientId: 'pat-1',
          portalUserId: 'user-pat-1',
          content: 'Oui, continuez à un rythme modéré.',
        },
      );
      expect(res.senderRole).toBe('practitioner');
    });
  });

  describe('listPatientPortalMessagesAction', () => {
    it('lists messages for authenticated patient', async () => {
      vi.mocked(requirePatientPortalAccess).mockResolvedValue(mockPatientCtx);
      vi.mocked(patientMessagingService.listPatientMessagesForPortal).mockResolvedValue([]);

      await listPatientPortalMessagesAction();

      expect(patientMessagingService.listPatientMessagesForPortal).toHaveBeenCalledWith(
        mockPatientCtx.userId,
        mockPatientCtx.patientId,
      );
    });
  });

  describe('listPractitionerPatientMessagesAction', () => {
    it('lists messages for practitioner with practitionerId context', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPractitionerCtx);
      vi.mocked(patientMessagingService.listPatientMessagesForPractitioner).mockResolvedValue([]);

      await listPractitionerPatientMessagesAction('pat-1');

      expect(patientMessagingService.listPatientMessagesForPractitioner).toHaveBeenCalledWith(
        mockPractitionerCtx.organizationId,
        mockPractitionerCtx.practitionerId,
        'pat-1',
      );
    });
  });

  describe('markPatientMessagesAsReadAction', () => {
    it('marks messages as read for patient', async () => {
      vi.mocked(requirePatientPortalAccess).mockResolvedValue(mockPatientCtx);
      vi.mocked(patientMessagingService.markMessagesAsRead).mockResolvedValue();

      const res = await markPatientMessagesAsReadAction('pat-1');

      expect(patientMessagingService.markMessagesAsRead).toHaveBeenCalledWith(
        mockPatientCtx.patientId,
        mockPatientCtx.userId,
      );
      expect(res.success).toBe(true);
    });
  });
});
