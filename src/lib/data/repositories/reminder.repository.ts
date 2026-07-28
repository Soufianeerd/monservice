import { BaseRepository } from './base.repository';
import { Reminder, ReminderSettings } from '../interfaces/reminder.interface';

export class ReminderRepository extends BaseRepository<Reminder> {
  constructor() {
    super([]);
  }

  async hasReminderBeenSent(entityId: string, type: string, daysOffset: number): Promise<boolean> {
    this.ensureLoaded();
    await this.simulateLatency();
    return this.items.some(
      (r) => r.entityId === entityId && r.type === type && r.daysOffset === daysOffset
    );
  }
}

export class ReminderSettingsRepository extends BaseRepository<ReminderSettings> {
  constructor() {
    super([
      {
        id: 'rs_1',
        organizationId: 'org_1',
        invoiceOverdueEnabled: true,
        invoiceOverdueDays: [7, 14, 30],
        quoteReminderEnabled: true,
        quoteReminderDays: [7, 14],
        quoteExpiringEnabled: true,
        quoteExpiringDays: 3,
      }
    ]);
  }

  async getByOrganizationId(organizationId: string): Promise<ReminderSettings | null> {
    this.ensureLoaded();
    await this.simulateLatency();
    return this.items.find((r) => r.organizationId === organizationId) || null;
  }
}

export const reminderRepository = new ReminderRepository();
export const reminderSettingsRepository = new ReminderSettingsRepository();
