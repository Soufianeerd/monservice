import { BaseRepository } from './base.repository';
import { Client } from '../interfaces';
import { clientsFixture } from '../fixtures';

export class ClientRepository extends BaseRepository<Client> {
  constructor() {
    super(clientsFixture);
  }

  async findByOrganization(organizationId: string): Promise<Client[]> {
    await this.simulateLatency();
    return this.items.filter(c => c.organizationId === organizationId).map(c => ({ ...c }));
  }

  async delete(id: string): Promise<boolean> {
    const success = await super.delete(id);
    if (success) {
      // Cascade delete Contacts
      const { contactRepository } = await import('./contact.repository');
      const contacts = await contactRepository.getAll();
      for (const contact of contacts.filter(c => c.clientId === id)) {
        await contactRepository.delete(contact.id);
      }

      // Cascade delete Deals
      const { dealRepository } = await import('./deal.repository');
      const deals = await dealRepository.getAll();
      for (const deal of deals.filter(d => d.clientId === id)) {
        await dealRepository.delete(deal.id);
      }

      // Cascade delete Invoices
      const { invoiceRepository } = await import('./invoice.repository');
      const invoices = await invoiceRepository.getAll();
      for (const invoice of invoices.filter(i => i.clientId === id)) {
        await invoiceRepository.delete(invoice.id);
      }
    }
    return success;
  }
}

export const clientRepository = new ClientRepository();
