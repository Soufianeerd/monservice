import { taskService } from '@/lib/services/task.service';
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
    return super.delete(id);
  }

  async deleteWithCascade(id: string): Promise<{ contacts: any[], deals: any[], invoices: any[], tasks: any[] }> {
    const { contactRepository } = await import('./contact.repository');
    const { dealRepository } = await import('./deal.repository');
    const { invoiceRepository } = await import('./invoice.repository');
    // Récupérer les entités associées pour la confirmation (si nécessaire, ou juste pour l'historique)
    const contacts = await contactRepository.findByClientId(id);
    const deals = await dealRepository.findByClientId(id);
    const invoices = await invoiceRepository.findByClientId(id);
    const tasks: any[] = []; // taskService migrated

    // Supprimer les entités associées
    await contactRepository.deleteByClientId(id);
    await dealRepository.deleteByClientId(id);
    await invoiceRepository.deleteByClientId(id);

    // Supprimer le client
    await this.delete(id);

    // Retourner les informations
    return { contacts, deals, invoices, tasks };
  }
}

export const clientRepository = new ClientRepository();
