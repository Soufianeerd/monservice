export class ReminderService {
  async checkAndSendReminders(organizationId: string): Promise<{ sent: number; errors: number }> {
    return { sent: 0, errors: 0 };
  }
}
export const reminderService = new ReminderService();
