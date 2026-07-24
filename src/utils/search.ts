import { clientRepository, contactRepository, dealRepository, taskRepository, productRepository, invoiceRepository } from '@/lib/data';
import { DEAL_STATUS_LABELS } from '@/lib/constants/statuses';

export interface SearchResult {
  id: string;
  type: 'CLIENT' | 'CONTACT' | 'DEAL' | 'TASK' | 'PRODUCT' | 'INVOICE';
  title: string;
  subtitle: string;
  url: string;
}

export async function globalSearch(query: string, organizationId: string): Promise<SearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const [clients, contacts, deals, tasks, products, invoices] = await Promise.all([
    clientRepository.findByOrganization(organizationId),
    contactRepository.findByOrganization(organizationId),
    dealRepository.findByOrganization(organizationId),
    taskRepository.findByOrganization(organizationId),
    productRepository.findByOrganization(organizationId),
    invoiceRepository.findByOrganization(organizationId)
  ]);

  const results: SearchResult[] = [];

  // Search clients
  clients.forEach(client => {
    if (client.name.toLowerCase().includes(normalizedQuery) || client.email?.toLowerCase().includes(normalizedQuery) || client.phone?.toLowerCase().includes(normalizedQuery)) {
      results.push({
        id: client.id,
        type: 'CLIENT',
        title: client.name,
        subtitle: client.email || client.phone || 'Client',
        url: `/clients/${client.id}`
      });
    }
  });

  // Search contacts
  contacts.forEach(contact => {
    if (contact.firstName.toLowerCase().includes(normalizedQuery) || contact.lastName.toLowerCase().includes(normalizedQuery) || contact.email?.toLowerCase().includes(normalizedQuery)) {
      results.push({
        id: contact.id,
        type: 'CONTACT',
        title: `${contact.firstName} ${contact.lastName}`,
        subtitle: contact.email || 'Contact',
        url: `/contacts/${contact.id}/edit` // Or contact detail page if it exists
      });
    }
  });

  // Search deals
  deals.forEach(deal => {
    if (deal.name.toLowerCase().includes(normalizedQuery)) {
      results.push({
        id: deal.id,
        type: 'DEAL',
        title: deal.name,
        subtitle: `${deal.value} € - ${DEAL_STATUS_LABELS[deal.status] || deal.status}`,
        url: `/deals/${deal.id}`
      });
    }
  });

  // Search tasks
  tasks.forEach(task => {
    if (task.title.toLowerCase().includes(normalizedQuery) || task.description?.toLowerCase().includes(normalizedQuery)) {
      results.push({
        id: task.id,
        type: 'TASK',
        title: task.title,
        subtitle: `Statut: ${task.status}`,
        url: `/tasks` // Or task modal depending on implementation
      });
    }
  });

  // Search products
  products.forEach(product => {
    if (product.name.toLowerCase().includes(normalizedQuery) || product.description.toLowerCase().includes(normalizedQuery)) {
      results.push({
        id: product.id,
        type: 'PRODUCT',
        title: product.name,
        subtitle: `${product.unitPrice} € HT`,
        url: `/products/${product.id}/edit`
      });
    }
  });

  // Search invoices
  invoices.forEach(invoice => {
    if (invoice.number.toLowerCase().includes(normalizedQuery)) {
      results.push({
        id: invoice.id,
        type: 'INVOICE',
        title: invoice.number,
        subtitle: `${invoice.totalTTC} € TTC - ${invoice.status}`,
        url: `/invoices/${invoice.id}`
      });
    }
  });

  return results;
}
