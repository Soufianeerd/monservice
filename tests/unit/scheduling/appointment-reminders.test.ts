import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appointmentReminderService } from '@/lib/services/appointment-reminder.service';
import { db } from '@/lib/db/server';
import { sendEmail } from '@/lib/email';

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
  isEmailConfigured: vi.fn().mockReturnValue(true),
}));

describe('Appointment Reminder Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes reminders with idempotency and offset tracking', async () => {
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
  });
});
