import { BaseRepository } from './base.repository';
import { Deal } from '../interfaces';
import { dealsFixture } from '../fixtures';

export class DealRepository extends BaseRepository<Deal> {
  constructor() {
    super(dealsFixture);
  }

  async findByOrganization(organizationId: string): Promise<Deal[]> {
    await this.simulateLatency();
    return this.items.filter(i => i.organizationId === organizationId).map(i => ({ ...i }));
  }
}

export const dealRepository = new DealRepository();
