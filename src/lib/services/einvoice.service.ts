import { Invoice } from '../data/interfaces';
import { generateUblInvoice, PopulatedInvoice } from './einvoice-templates';
import { storageService } from '../storage/storage.service';
import { db } from '../db/server';
import { invoices } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import JSZip from 'jszip';
import { clientService } from './client.service';
import { organizationService } from './organization.service';
import { invoiceService } from './invoice.service';

export interface EinvoiceResult {
  invoiceId: string;
  format: 'UBL' | 'Factur-X' | 'XRechnung' | 'PeppolBIS';
  content: string | Buffer; 
  hash: string; 
  path: string; 
  size: number;
}

export interface EinvoiceOptions {
  format?: 'UBL' | 'Factur-X' | 'XRechnung' | 'PeppolBIS';
  includePdf?: boolean; 
  language?: 'fr' | 'de' | 'nl' | 'en';
}

export class EinvoiceService {
  async generate(invoiceId: string, options: EinvoiceOptions = {}): Promise<EinvoiceResult> {
    // 1. Get populated invoice with supplier and customer info
    const invoice = await this.getInvoiceWithDependencies(invoiceId);
    
    // 2. Determine format based on customer country if not explicitly provided
    const format = options.format || this.determineFormat(invoice);
    
    // 3. Generate content
    let content: string | Buffer;
    let fileName: string;
    
    switch (format) {
      case 'Factur-X':
        content = await this.generateFacturX(invoice);
        fileName = `facturx_${invoice.number}.zip`;
        break;
      case 'XRechnung':
        content = this.generateXRechnung(invoice);
        fileName = `xrechnung_${invoice.number}.xml`;
        break;
      case 'PeppolBIS':
        content = this.generatePeppolBis(invoice);
        fileName = `peppol_${invoice.number}.xml`;
        break;
      default:
        content = generateUblInvoice(invoice);
        fileName = `ubl_${invoice.number}.xml`;
    }
    
    // 4. Calculate hash
    const hash = this.calculateHash(content);
    
    // 5. Store file
    const path = await storageService.save(fileName, content);
    
    // 6. Update invoice
    await db.update(invoices).set({
      einvoiceFormat: format,
      structuredInvoiceHash: hash,
      structuredInvoicePath: path,
      updatedAt: new Date().toISOString()
    }).where(eq(invoices.id, invoiceId));
    
    return {
      invoiceId,
      format,
      content,
      hash,
      path,
      size: content.length,
    };
  }

  private async getInvoiceWithDependencies(invoiceId: string): Promise<PopulatedInvoice> {
    // Retrieve base invoice
    const result = await invoiceService.getById(invoiceId);

    if (!result) throw new Error('Invoice not found');

    const client = await clientService.findById(result.clientId, result.organizationId);
    const org = await organizationService.getById(result.organizationId);

    if (!client || !org) throw new Error('Missing client or organization data');

    return {
      ...result,
      type: result.type as any,
      status: result.status as any,
      lines: result.lines as any,
      supplier: {
        name: org.name,
        vatId: result.supplierVatId,
        address: org.address,
        country: result.supplierCountry || org.country,
      },
      customer: {
        name: client.name,
        vatId: result.customerVatId,
        address: client.address,
        country: result.customerCountry || client.country,
      }
    };
  }

  private determineFormat(invoice: PopulatedInvoice): 'UBL' | 'Factur-X' | 'XRechnung' | 'PeppolBIS' {
    const customerCountry = invoice.customer.country?.toUpperCase() || '';
    const customerType = invoice.customerType;

    if (customerCountry === 'BE' && customerType === 'B2B') return 'PeppolBIS';
    if (customerCountry === 'FR') return 'Factur-X';
    if (customerCountry === 'DE') return 'XRechnung';
    if (customerCountry === 'LU') return 'XRechnung'; // standard for B2G, can be UBL for B2B

    return 'UBL'; // Default fallback
  }

  private calculateHash(content: string | Buffer): string {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private async generateFacturX(invoice: PopulatedInvoice): Promise<Buffer> {
    const xml = generateUblInvoice(invoice);
    
    // Minimal mock PDF generation for MVP. 
    // Normally we would use @react-pdf/renderer here to generate the PDF string/stream
    const mockPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Facture) >>\nendobj\n%%EOF');
    
    // Bundle in a ZIP for Factur-X Hybrid MVP
    const zip = new JSZip();
    zip.file(`invoice_${invoice.number}.pdf`, mockPdfBuffer);
    zip.file(`factur-x.xml`, xml);

    return await zip.generateAsync({ type: 'nodebuffer' });
  }

  private generateXRechnung(invoice: PopulatedInvoice): string {
    return generateUblInvoice(invoice, { profile: 'XRechnung' });
  }

  private generatePeppolBis(invoice: PopulatedInvoice): string {
    return generateUblInvoice(invoice, { profile: 'PeppolBIS' });
  }
}

export const einvoiceService = new EinvoiceService();
