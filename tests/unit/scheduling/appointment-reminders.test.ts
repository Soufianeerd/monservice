import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appointmentReminderService } from '@/lib/services/appointment-reminder.service';
import { db } from '@/lib/db/server';
import { sendEmail, isEmailConfigured } from '@/lib/email';

const mockReturning = vi.fn();
const mockOnConflictDoNothing = vi.fn(() => ({ returning: mockReturning }));
const mockValues = vi.fn(() => ({ onConflictDoNothing: mockOnConflictDoNothing }));
const mockWhere = vi.fn();
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

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
  isEmailConfigured: vi.fn(),
}));

describe('Appointment Reminder Service', () => {
  const mockApptRow = {
    appointment: {
      id: 'apt-1',
      organizationId: 'org-1',
      startsAt: new Date(Date.now() + 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 24.5 * 3600 * 1000),
      status: 'scheduled',
    },
    patient: {
      id: 'pat-1',
      usedFirstName: 'Jean',
      firstBirthName: 'Jean',
      usedName: 'Dupont',
      birthName: null,
      email: 'jean.dupont@test.fr',
    },
    type: {
      name: 'Consultation Bilan',
    },
    location: {
      name: 'Cabinet Santé',
      address: '10 Rue de la Paix',
      city: 'Paris',
    },
    room: {
      name: 'Salle 1',
    },
    practitioner: {
      displayName: 'Dr Martin',
    },
    org: {
      id: 'org-1',
      name: 'Cabinet Santé Paris',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isEmailConfigured).mockReturnValue(true);
  });

  it('processes reminders with atomic claim-before-send and offset tracking', async () => {
    let selectCallCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockImplementation(() => {
            if (selectCallCount % 2 === 1) {
              return Promise.resolve([mockApptRow]);
            } else {
              return Promise.resolve([]);
            }
          }),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);
    mockReturning.mockResolvedValue([{ id: 'rem-del-1' }]);
    mockWhere.mockResolvedValue([]);

    vi.mocked(sendEmail).mockResolvedValue({
      sent: true,
      id: 'msg-send-1',
    });

    const result = await appointmentReminderService.processAppointmentReminders({
      organizationId: 'org-1',
    });

    expect(result.processed).toBeGreaterThan(0);
    expect(result.sent).toBeGreaterThan(0);
    expect(sendEmail).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', sentAt: null }));
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent', sentAt: expect.any(Date) }));
  });

  it('proves concurrent race condition safety (concurrent idempotency test)', async () => {
    // Simulating appointment found in 24h offset scan only
    let selectCallCount = 0;
    const mockSelectWorker = vi.fn().mockImplementation(() => {
      selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockImplementation(() => {
            if (selectCallCount % 2 === 1) {
              return Promise.resolve([mockApptRow]);
            } else {
              return Promise.resolve([]);
            }
          }),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelectWorker);
    vi.mocked(sendEmail).mockResolvedValue({ sent: true, id: 'msg-send-race' });
    mockWhere.mockResolvedValue([]);

    // Worker A succeeds in claiming (returns ID)
    // Worker B fails to claim on conflict (returns empty array)
    let insertCallCount = 0;
    mockReturning.mockImplementation(() => {
      insertCallCount++;
      if (insertCallCount === 1) {
        return Promise.resolve([{ id: 'claimed-by-worker-a' }]);
      } else {
        return Promise.resolve([]); // ON CONFLICT DO NOTHING returned 0 rows
      }
    });

    // Run worker A and worker B
    const resultA = await appointmentReminderService.processAppointmentReminders({ organizationId: 'org-1' });
    const resultB = await appointmentReminderService.processAppointmentReminders({ organizationId: 'org-1' });

    // Worker A claimed and sent
    expect(resultA.sent).toBe(1);

    // Worker B was skipped because claim was rejected
    expect(resultB.skipped).toBe(1);
    expect(resultB.sent).toBe(0);

    // Across both workers, sendEmail was called EXACTLY ONCE
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('handles unconfigured email safely without creating sent record (email disabled test)', async () => {
    vi.mocked(isEmailConfigured).mockReturnValue(false);

    let selectCallCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockImplementation(() => {
            if (selectCallCount % 2 === 1) {
              return Promise.resolve([mockApptRow]);
            } else {
              return Promise.resolve([]);
            }
          }),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);
    mockReturning.mockResolvedValue([{ id: 'rem-del-unconfigured' }]);
    mockWhere.mockResolvedValue([]);

    const result = await appointmentReminderService.processAppointmentReminders({
      organizationId: 'org-1',
    });

    // sendEmail must NOT be called
    expect(sendEmail).not.toHaveBeenCalled();

    // Result marked as skipped
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);

    // Status updated to failed with sentAt null, never sent
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', sentAt: null }));
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', sentAt: null }));
  });

  it('handles provider sendEmail failure safely by marking status failed and sentAt null', async () => {
    let selectCallCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockImplementation(() => {
            if (selectCallCount % 2 === 1) {
              return Promise.resolve([mockApptRow]);
            } else {
              return Promise.resolve([]);
            }
          }),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);
    mockReturning.mockResolvedValue([{ id: 'rem-del-fail' }]);
    mockWhere.mockResolvedValue([]);
    vi.mocked(sendEmail).mockRejectedValue(new Error('SMTP connection failure'));

    const result = await appointmentReminderService.processAppointmentReminders({
      organizationId: 'org-1',
    });

    expect(result.sent).toBe(0);
    expect(result.errors).toBe(1);
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', sentAt: null }));
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', sentAt: null }));
  });
});
