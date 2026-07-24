import { BaseRepository } from './base.repository';
import { Notification } from '../interfaces';
import { notificationsFixture } from '../fixtures';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super(notificationsFixture);
  }

  async findByOrganization(organizationId: string): Promise<Notification[]> {
    this.ensureLoaded();
    await this.simulateLatency();
    return this.items.filter(item => item.organizationId === organizationId);
  }

  async findByUser(userId: string): Promise<Notification[]> {
    this.ensureLoaded();
    await this.simulateLatency();
    return this.items.filter(item => item.userId === userId || item.userId === '').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadCount(organizationId: string, userId: string): Promise<number> {
    const items = await this.findByOrganization(organizationId);
    return items.filter(item => !item.isRead && (item.userId === userId || item.userId === '')).length;
  }

  async markAsRead(id: string): Promise<Notification | undefined> {
    const res = await this.update(id, { isRead: true });
    return res || undefined;
  }

  async markAllAsRead(organizationId: string, userId: string): Promise<void> {
    const items = await this.findByOrganization(organizationId);
    for (const item of items) {
      if (!item.isRead && (item.userId === userId || item.userId === '')) {
        await this.update(item.id, { isRead: true });
      }
    }
  }
}

export const notificationRepository = new NotificationRepository();
