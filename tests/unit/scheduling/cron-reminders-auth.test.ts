import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/reminders/appointments/check/route';
import { NextRequest } from 'next/server';
import { appointmentReminderService } from '@/lib/services/appointment-reminder.service';
import { getSessionContext } from '@/lib/auth/session';

vi.mock('@/lib/services/appointment-reminder.service', () => ({
  appointmentReminderService: {
    processAppointmentReminders: vi.fn(),
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionContext: vi.fn(),
}));

describe('Cron Appointment Reminders Authorization Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: 'test-cron-secret-123' };
  });

  it('allows global execution when x-cron-secret header matches CRON_SECRET', async () => {
    vi.mocked(appointmentReminderService.processAppointmentReminders).mockResolvedValue({
      processed: 5,
      sent: 2,
      skipped: 3,
      errors: 0,
    });

    const req = new NextRequest('http://localhost/api/reminders/appointments/check', {
      headers: {
        'x-cron-secret': 'test-cron-secret-123',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.processed).toBe(5);
    expect(appointmentReminderService.processAppointmentReminders).toHaveBeenCalledWith();
  });

  it('rejects client session calling cron route without secret (P1 Cron Client Attack Test)', async () => {
    vi.mocked(getSessionContext).mockResolvedValue({
      userId: 'client-user-1',
      email: 'client@cabinet.fr',
      profileType: 'client',
      organizationId: 'org-health-1',
    });

    const req = new NextRequest('http://localhost/api/reminders/appointments/check');

    const res = await GET(req);
    expect(res.status).toBe(403);
    expect(appointmentReminderService.processAppointmentReminders).not.toHaveBeenCalled();
  });

  it('allows professional session to trigger reminders scoped to own organization when called without secret', async () => {
    vi.mocked(getSessionContext).mockResolvedValue({
      userId: 'pro-user-1',
      email: 'pro@cabinet.fr',
      profileType: 'professional',
      organizationId: 'org-health-1',
    });

    vi.mocked(appointmentReminderService.processAppointmentReminders).mockResolvedValue({
      processed: 2,
      sent: 1,
      skipped: 1,
      errors: 0,
    });

    const req = new NextRequest('http://localhost/api/reminders/appointments/check');

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(appointmentReminderService.processAppointmentReminders).toHaveBeenCalledWith({
      organizationId: 'org-health-1',
    });
  });

  it('rejects unauthenticated request without secret', async () => {
    vi.mocked(getSessionContext).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/reminders/appointments/check');

    const res = await GET(req);
    expect(res.status).toBe(403);
    expect(appointmentReminderService.processAppointmentReminders).not.toHaveBeenCalled();
  });
});
