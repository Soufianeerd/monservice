import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appointmentReminderService } from '@/lib/services/appointment-reminder.service';
import { db } from '@/lib/db/server';
import { sendEmail } from '@/lib/email';

vi.mock('@/lib/db/server', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

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

    // Chainable select helper
    const makeQueryBuilder = (result: unknown) => {
      const qb = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(result),
      };
      return qb;
    };

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount % 2 === 1) {
        // Main query returning appointments
        return makeQueryBuilder([mockApptRow]) as ReturnType<typeof db.select>;
      } else {
        // Delivery check returning empty (no existing delivery)
        return makeQueryBuilder([]) as ReturnType<typeof db.select>;
      }
    });

    // Mock insert chain with onConflictDoNothing
    const onConflictDoNothing = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'rem-del-1' }]),
    });
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    vi.mocked(db.insert).mockReturnValue({ values } as ReturnType<typeof db.insert>);

    // Mock sendEmail
    vi.mocked(sendEmail).mockResolvedValue({
      sent: true,
      id: 'msg-send-1',
    });

    // Mock update chain
    const updateWhere = vi.fn().mockResolvedValue([]);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    vi.mocked(db.update).mockReturnValue({ set: updateSet } as ReturnType<typeof db.update>);

    const result = await appointmentReminderService.processAppointmentReminders({
      organizationId: 'org-1',
    });

    expect(result.processed).toBeGreaterThan(0);
    expect(result.sent).toBeGreaterThan(0);
  });
});
