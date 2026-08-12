import { Invoice } from '../data/interfaces';
import { PeppolAdapter } from './delivery-adapters/peppol.adapter';
import { PDPAdapter } from './delivery-adapters/pdp.adapter';
import { EmailAdapter } from './delivery-adapters/email.adapter';
import { DeliveryResult } from './delivery.types';
import { db } from '../db/server';
import { invoices } from '../db/schema';
import { eq } from 'drizzle-orm';
import { invoiceService } from './invoice.service';
import { storageService } from '../storage/storage.service';

export class DeliveryService {
  async sendInvoice(invoiceId: string): Promise<DeliveryResult> {
    // 1. Get the invoice
    const invoice = await invoiceService.getById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    
    // 2. Determine the channel
    const channel = this.determineChannel(invoice);
    
    // 3. Retrieve structured file
    if (!invoice.structuredInvoicePath) {
      throw new Error('Structured invoice file path not found on this invoice');
    }
    
    const structuredFile = await storageService.getFileBuffer(invoice.structuredInvoicePath);
    
    // 4. Send via appropriate channel
    let response: any;
    let trackingId: string | undefined;
    
    switch (channel) {
      case 'peppol':
        response = await this.sendViaPeppol(invoice, structuredFile);
        trackingId = response.messageId;
        break;
      case 'pdp':
        response = await this.sendViaPDP(invoice, structuredFile);
        trackingId = response.platformId;
        break;
      case 'email':
        response = await this.sendViaEmail(invoice, structuredFile);
        trackingId = response.messageId;
        break;
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
    
    // 5. Update the invoice
    const attempts = (invoice.deliveryAttempts || 0) + 1;
    
    await db.update(invoices).set({
      deliveryChannel: channel,
      deliveryStatus: response.success ? 'sent' : 'failed',
      deliveryTrackingId: trackingId || null,
      deliveryResponse: JSON.stringify(response),
      deliveryAttempts: attempts,
      deliverySentAt: response.success ? new Date() : null,
      deliveryLastAttemptAt: new Date(),
      updatedAt: new Date().toISOString()
    }).where(eq(invoices.id, invoiceId));
    
    return {
      invoiceId,
      channel,
      status: response.success ? 'sent' : 'failed',
      response,
      trackingId,
      sentAt: new Date(),
    };
  }

  private determineChannel(invoice: Invoice): 'peppol' | 'pdp' | 'email' {
    const customerCountry = invoice.customerCountry?.toUpperCase() || '';
    
    // BE B2B → Peppol
    if (customerCountry === 'BE' && invoice.customerType === 'B2B') {
      return 'peppol';
    }
    // FR → PDP
    if (customerCountry === 'FR') {
      return 'pdp';
    }
    // Default → email
    return 'email';
  }

  private async sendViaPeppol(invoice: Invoice, file: Buffer) {
    const adapter = new PeppolAdapter();
    return await adapter.send(invoice, file);
  }

  private async sendViaPDP(invoice: Invoice, file: Buffer) {
    const adapter = new PDPAdapter();
    return await adapter.send(invoice, file);
  }

  private async sendViaEmail(invoice: Invoice, file: Buffer) {
    const adapter = new EmailAdapter();
    return await adapter.send(invoice, file);
  }
}
