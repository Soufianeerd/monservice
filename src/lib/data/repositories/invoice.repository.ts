import { BaseRepository } from './base.repository';
import { Invoice } from '../interfaces';
import { invoicesFixture } from '../fixtures';
import { parseInvoiceNumber, formatInvoiceNumber } from '../../../utils/invoice-number';

export class InvoiceRepository extends BaseRepository<Invoice> {
  constructor() {
    super(invoicesFixture);
  }

  async findByOrganization(organizationId: string): Promise<Invoice[]> {
    await this.simulateLatency();
    return this.items.filter((i) => i.organizationId === organizationId);
  }

  async findByClient(clientId: string): Promise<Invoice[]> {
    await this.simulateLatency();
    return this.items.filter((i) => i.clientId === clientId);
  }

  async findByStatus(status: string): Promise<Invoice[]> {
    await this.simulateLatency();
    return this.items.filter((i) => i.status === status);
  }

  async getNextNumber(type: 'invoice' | 'quote', year: number): Promise<string> {
    await this.simulateLatency();
    
    const currentYearInvoices = this.items.filter(
      (i) => i.type === type && new Date(i.createdAt).getFullYear() === year
    );
    
    let maxNum = 0;
    for (const inv of currentYearInvoices) {
      const parsed = parseInvoiceNumber(inv.number);
      if (parsed && parsed.year === year && parsed.sequence > maxNum) {
        maxNum = parsed.sequence;
      }
    }
    
    return formatInvoiceNumber(type, year, maxNum + 1);
  }
}

export const invoiceRepository = new InvoiceRepository();
