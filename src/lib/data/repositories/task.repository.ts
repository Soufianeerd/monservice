import { BaseRepository } from './base.repository';
import { Task } from '../interfaces';
import { tasksFixture } from '../fixtures';

export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super(tasksFixture);
  }

  async findByOrganization(organizationId: string): Promise<Task[]> {
    await this.simulateLatency();
    return this.items.filter(i => i.organizationId === organizationId).map(i => ({ ...i }));
  }

  async findByClientId(clientId: string): Promise<Task[]> {
    this.ensureLoaded();
    await this.simulateLatency();
    return this.items.filter(i => i.entityType === 'client' && i.entityId === clientId).map(i => ({ ...i }));
  }

  async deleteByClientId(clientId: string): Promise<void> {
    this.ensureLoaded();
    await this.simulateLatency();
    this.items = this.items.filter(item => !(item.entityType === 'client' && item.entityId === clientId));
    this.persist();
  }
}

export const taskRepository = new TaskRepository();
