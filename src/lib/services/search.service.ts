import { taskService } from '@/lib/services/task.service';
import { clientRepository, contactRepository, dealRepository, invoiceRepository, productRepository } from '@/lib/data';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'client' | 'contact' | 'deal' | 'invoice' | 'product' | 'task';
  link: string;
  score: number;
}

export class SearchService {
  async search(query: string, organizationId: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    const normalizedQuery = query.toLowerCase().trim();
    
    // Recherche parallèle dans tous les repositories
    const [clients, contacts, deals, invoices, products, tasks] = await Promise.all([
      clientRepository.findByOrganization(organizationId),
      contactRepository.findByOrganization(organizationId),
      dealRepository.findByOrganization(organizationId),
      invoiceRepository.findByOrganization(organizationId),
      productRepository.findByOrganization(organizationId),
      taskService.findByOrganization(organizationId),
    ]);

    const results: SearchResult[] = [];

    // Clients
    clients.forEach(client => {
      if (client.name.toLowerCase().includes(normalizedQuery) ||
          client.email?.toLowerCase().includes(normalizedQuery)) {
        results.push({
          id: client.id,
          title: client.name,
          subtitle: client.email || 'Client',
          type: 'client',
          link: `/clients/${client.id}`,
          score: this.calculateScore(normalizedQuery, client.name, client.email),
        });
      }
    });

    // Contacts
    contacts.forEach(contact => {
      const fullName = `${contact.firstName} ${contact.lastName}`;
      if (fullName.toLowerCase().includes(normalizedQuery) ||
          contact.email?.toLowerCase().includes(normalizedQuery)) {
        results.push({
          id: contact.id,
          title: fullName,
          subtitle: contact.email || 'Contact',
          type: 'contact',
          link: `/contacts/${contact.id}`,
          score: this.calculateScore(normalizedQuery, fullName, contact.email),
        });
      }
    });

    // Deals
    deals.forEach(deal => {
      if (deal.name.toLowerCase().includes(normalizedQuery)) {
        results.push({
          id: deal.id,
          title: deal.name,
          subtitle: `${deal.status} - ${deal.value}€`,
          type: 'deal',
          link: `/deals/${deal.id}`,
          score: this.calculateScore(normalizedQuery, deal.name),
        });
      }
    });

    // Factures
    invoices.forEach(invoice => {
      if (invoice.number.toLowerCase().includes(normalizedQuery)) {
        results.push({
          id: invoice.id,
          title: invoice.number,
          subtitle: `${invoice.totalTTC}€ - ${invoice.status}`,
          type: 'invoice',
          link: `/invoices/${invoice.id}`,
          score: this.calculateScore(normalizedQuery, invoice.number),
        });
      }
    });

    // Produits
    products.forEach(product => {
      if (product.name.toLowerCase().includes(normalizedQuery) || product.description?.toLowerCase().includes(normalizedQuery)) {
        results.push({
          id: product.id,
          title: product.name,
          subtitle: `${product.unitPrice} € HT - ${product.description || ''}`,
          type: 'product',
          link: `/products/${product.id}`,
          score: this.calculateScore(normalizedQuery, product.name, product.description),
        });
      }
    });

    // Tâches
    tasks.forEach(task => {
      if (task.title.toLowerCase().includes(normalizedQuery)) {
        results.push({
          id: task.id,
          title: task.title,
          subtitle: `${task.status} - ${task.priority}`,
          type: 'task',
          link: `/tasks/${task.id}`,
          score: this.calculateScore(normalizedQuery, task.title),
        });
      }
    });

    // Trier par score (pertinence)
    return results.sort((a, b) => b.score - a.score).slice(0, 20);
  }

  private calculateScore(query: string, ...fields: (string | null | undefined)[]): number {
    let score = 0;
    for (const field of fields) {
      if (field) {
        const lowerField = field.toLowerCase();
        if (lowerField === query) score += 100;
        else if (lowerField.startsWith(query)) score += 50;
        else if (lowerField.includes(query)) score += 10;
      }
    }
    return score;
  }
}

export const searchService = new SearchService();
