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

  async findByClientId(clientId: string): Promise<Deal[]> {
    this.ensureLoaded();
    await this.simulateLatency();
    return this.items.filter(i => i.clientId === clientId).map(i => ({ ...i }));
  }

  async deleteByClientId(clientId: string): Promise<void> {
    this.ensureLoaded();
    await this.simulateLatency();
    this.items = this.items.filter(item => item.clientId !== clientId);
    this.persist();
  }

  async updateSignature(id: string, signatureData: string): Promise<Deal | null> {
    this.ensureLoaded();
    await this.simulateLatency();
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return null;

    const deal = this.items[index];
    deal.signature = signatureData;
    deal.signedAt = new Date().toISOString();
    deal.status = 'won'; // 'accepted' equivalent in DealStatus based on current enum 'prospect' | 'qualification' | 'negotiation' | 'proposal' | 'won' | 'lost'
    deal.updatedAt = new Date().toISOString();
    
    this.persist();
    return { ...deal };
  }
}

export const dealRepository = new DealRepository();
