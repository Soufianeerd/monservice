export class NotificationService {
  async generateNotifications(organizationId: string): Promise<void> {}
  async markAsRead(notificationId: string): Promise<void> {}
  async markAllAsRead(organizationId: string, userId: string): Promise<void> {}
  async getUnreadCount(organizationId: string, userId: string): Promise<number> { return 0; }
  async findAll(organizationId: string) { return []; }
}
export const notificationService = new NotificationService();
