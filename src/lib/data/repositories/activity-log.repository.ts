import { BaseRepository } from './base.repository';
import { ActivityLog } from '../interfaces';
import { activityLogsFixture } from '../fixtures';

export class ActivityLogRepository extends BaseRepository<ActivityLog> {
  constructor() {
    super(activityLogsFixture);
  }

  async findByOrganization(organizationId: string): Promise<ActivityLog[]> {
    await this.simulateLatency();
    return this.items.filter(item => item.organizationId === organizationId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findByUser(userId: string): Promise<ActivityLog[]> {
    await this.simulateLatency();
    return this.items.filter(item => item.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findRecent(organizationId: string, limit: number = 10): Promise<ActivityLog[]> {
    const logs = await this.findByOrganization(organizationId);
    return logs.slice(0, limit);
  }
}

export const activityLogRepository = new ActivityLogRepository();
