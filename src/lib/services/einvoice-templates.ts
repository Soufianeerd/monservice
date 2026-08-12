import { Invoice, Client, Organization } from '../data/interfaces';
import { UblBuilder } from '../utils/xml-builder';

// Interface étendue temporairement car Organization et Client ne sont pas
// completement chargés dans Invoice au moment de l'appel depuis einvoice.service
export interface PopulatedInvoice extends Invoice {
  supplier: { name: string; vatId?: string | null; address?: string | null; country?: string | null };
  customer: { name: string; vatId?: string | null; address?: string | null; country?: string | null };
}

export function generateUblInvoice(invoice: PopulatedInvoice, options?: { profile?: 'XRechnung' | 'PeppolBIS' }): string {
  const builder = new UblBuilder();
  builder.setInvoiceType('380'); // 380 = Commercial Invoice in UNTDID 1001
  builder.setId(invoice.number);
  builder.setIssueDate(invoice.date);
  builder.setDueDate(invoice.dueDate);
  
  builder.setSupplier(invoice.supplier);
  builder.setCustomer(invoice.customer);
  
  invoice.lines.forEach((line, index) => {
    builder.addLine({
      id: line.id || `line-${index + 1}`,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      vatRate: line.taxRate,
      total: line.totalHT,
    });
  });

  builder.setTotals({
    subtotal: invoice.totalHT,
    tax: invoice.taxAmount,
    total: invoice.totalTTC,
  });

  if (options?.profile === 'XRechnung') {
    builder.addXRechnungExtension();
  } else if (options?.profile === 'PeppolBIS') {
    builder.addPeppolExtension();
  } else {
    // Basic EN16931 compliance
    // this.xml.ele('cbc:CustomizationID').txt('urn:cen.eu:en16931:2017');
    // But handled directly via xml-builder if needed
  }

  return builder.build();
}
