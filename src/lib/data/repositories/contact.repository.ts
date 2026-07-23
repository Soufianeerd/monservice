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
}

export const contactRepository = new ContactRepository();
