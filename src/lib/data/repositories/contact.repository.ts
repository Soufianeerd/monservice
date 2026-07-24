import { BaseRepository } from './base.repository';
import { Contact } from '../interfaces';
import { contactsFixture } from '../fixtures';

export class ContactRepository extends BaseRepository<Contact> {
  constructor() {
    super(contactsFixture);
  }

  async findByOrganization(organizationId: string): Promise<Contact[]> {
    await this.simulateLatency();
    return this.items.filter(i => i.organizationId === organizationId).map(i => ({ ...i }));
  }

  async findByClientId(clientId: string): Promise<Contact[]> {
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
}

export const contactRepository = new ContactRepository();
