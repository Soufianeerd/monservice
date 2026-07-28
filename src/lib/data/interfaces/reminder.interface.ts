export type ReminderType = 'invoice_overdue' | 'quote_reminder' | 'quote_expiring';

export interface Reminder {
  id: string;
  type: ReminderType;
  entityId: string; // ID of the invoice or quote
  organizationId: string;
  daysOffset: number; // e.g. 7, 14, 30 for overdue, or -3 for expiring
  sentAt: string;
}

export interface ReminderSettings {
  id: string;
  organizationId: string;
  invoiceOverdueEnabled: boolean;
  invoiceOverdueDays: number[]; // e.g. [7, 14, 30]
  quoteReminderEnabled: boolean;
  quoteReminderDays: number[]; // e.g. [7, 14]
  quoteExpiringEnabled: boolean;
  quoteExpiringDays: number; // e.g. 3 (for J-3)
}
