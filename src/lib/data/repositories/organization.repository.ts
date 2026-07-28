import { BaseRepository } from './base.repository';
import { Organization } from '../interfaces';
import { organizationsFixture } from '../fixtures';

export class OrganizationRepository extends BaseRepository<Organization> {
  constructor() {
    super(organizationsFixture);
  }

  async updateSector(orgId: string, sector: string): Promise<Organization | null> {
    await this.simulateLatency();
    const index = this.items.findIndex(item => item.id === orgId);
    if (index === -1) return null;
    
    this.items[index] = {
      ...this.items[index],
      sector,
      updatedAt: new Date().toISOString()
    };
    return { ...this.items[index] };
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    this.ensureLoaded();
    await this.simulateLatency();
    const org = this.items.find(item => item.slug === slug);
    return org ? { ...org } : null;
  }

  async updatePublicProfile(orgId: string, data: Partial<Organization>): Promise<Organization | null> {
    this.ensureLoaded();
    await this.simulateLatency();
    const index = this.items.findIndex(item => item.id === orgId);
    if (index === -1) return null;
    
    this.items[index] = {
      ...this.items[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return { ...this.items[index] };
  }
}

export const organizationRepository = new OrganizationRepository();
