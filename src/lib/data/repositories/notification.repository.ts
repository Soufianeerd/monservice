import { BaseRepository } from './base.repository';
import { Notification } from '../interfaces';
import { notificationsFixture } from '../fixtures';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super(notificationsFixture);
  }

  async findByUser(userId: string): Promise<Notification[]> {
    await this.simulateLatency();
    return this.items.filter(item => item.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async markAsRead(id: string): Promise<Notification | undefined> {
    const res = await this.update(id, { read: true });
    return res || undefined;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.simulateLatency();
    this.items = this.items.map(item => item.userId === userId ? { ...item, read: true } : item);
  }
}

export const notificationRepository = new NotificationRepository();
