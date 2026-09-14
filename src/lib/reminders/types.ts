export const REMINDER_OFFSETS_MINUTES = [1440, 120] as const; // 24h et 2h

export type ReminderOffsetMinutes = (typeof REMINDER_OFFSETS_MINUTES)[number];

export interface ProcessedReminderResult {
  appointmentId: string;
  offsetMinutes: number;
  recipientEmail: string;
  status: 'sent' | 'skipped' | 'failed';
  reason?: string;
}
