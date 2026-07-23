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
}

export const taskRepository = new TaskRepository();
