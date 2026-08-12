import { create } from 'xmlbuilder2';

export class UblBuilder {
  private xml: any;

  constructor() {
    this.xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('Invoice', {
        xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      });
  }

  setInvoiceType(type: string) {
    this.xml.ele('cbc:InvoiceTypeCode').txt(type);
    return this;
  }

  setId(id: string) {
    this.xml.ele('cbc:ID').txt(id);
    return this;
  }

  setIssueDate(date: string) {
    this.xml.ele('cbc:IssueDate').txt(date.split('T')[0]);
    return this;
  }

  setDueDate(date?: string | null) {
    if (date) {
      this.xml.ele('cbc:DueDate').txt(date.split('T')[0]);
    }
    return this;
  }

  setSupplier(supplier: { name: string; vatId?: string | null; address?: string | null; country?: string | null }) {
    const party = this.xml.ele('cac:AccountingSupplierParty').ele('cac:Party');
    
    party.ele('cac:PartyName').ele('cbc:Name').txt(supplier.name);
    
    if (supplier.address || supplier.country) {
      const address = party.ele('cac:PostalAddress');
      if (supplier.address) address.ele('cbc:StreetName').txt(supplier.address);
      if (supplier.country) address.ele('cac:Country').ele('cbc:IdentificationCode').txt(supplier.country);
    }

    if (supplier.vatId) {
      party.ele('cac:PartyTaxScheme')
        .ele('cbc:CompanyID').txt(supplier.vatId).up()
        .ele('cac:TaxScheme').ele('cbc:ID').txt('VAT');
    }

    return this;
  }

  setCustomer(customer: { name: string; vatId?: string | null; address?: string | null; country?: string | null }) {
    const party = this.xml.ele('cac:AccountingCustomerParty').ele('cac:Party');
    
    party.ele('cac:PartyName').ele('cbc:Name').txt(customer.name);
    
    if (customer.address || customer.country) {
      const address = party.ele('cac:PostalAddress');
      if (customer.address) address.ele('cbc:StreetName').txt(customer.address);
      if (customer.country) address.ele('cac:Country').ele('cbc:IdentificationCode').txt(customer.country);
    }

    if (customer.vatId) {
      party.ele('cac:PartyTaxScheme')
        .ele('cbc:CompanyID').txt(customer.vatId).up()
        .ele('cac:TaxScheme').ele('cbc:ID').txt('VAT');
    }

    return this;
  }

  addLine(line: { id: string, description: string; quantity: number; unitPrice: number; vatRate: number; total: number }) {
    const invoiceLine = this.xml.ele('cac:InvoiceLine');
    invoiceLine.ele('cbc:ID').txt(line.id);
    invoiceLine.ele('cbc:InvoicedQuantity', { unitCode: 'EA' }).txt(line.quantity.toString());
    invoiceLine.ele('cbc:LineExtensionAmount', { currencyID: 'EUR' }).txt(line.total.toString());
    
    const item = invoiceLine.ele('cac:Item');
    item.ele('cbc:Description').txt(line.description);
    item.ele('cbc:Name').txt(line.description);
    
    item.ele('cac:ClassifiedTaxCategory')
      .ele('cbc:ID').txt(line.vatRate > 0 ? 'S' : 'Z').up() // S=Standard, Z=Zero rated
      .ele('cbc:Percent').txt(line.vatRate.toString()).up()
      .ele('cac:TaxScheme').ele('cbc:ID').txt('VAT');
      
    invoiceLine.ele('cac:Price').ele('cbc:PriceAmount', { currencyID: 'EUR' }).txt(line.unitPrice.toString());

    return this;
  }

  setTotals(totals: { subtotal: number; tax: number; total: number }) {
    const taxTotal = this.xml.ele('cac:TaxTotal');
    taxTotal.ele('cbc:TaxAmount', { currencyID: 'EUR' }).txt(totals.tax.toString());
    
    const legalTotal = this.xml.ele('cac:LegalMonetaryTotal');
    legalTotal.ele('cbc:LineExtensionAmount', { currencyID: 'EUR' }).txt(totals.subtotal.toString());
    legalTotal.ele('cbc:TaxExclusiveAmount', { currencyID: 'EUR' }).txt(totals.subtotal.toString());
    legalTotal.ele('cbc:TaxInclusiveAmount', { currencyID: 'EUR' }).txt(totals.total.toString());
    legalTotal.ele('cbc:PayableAmount', { currencyID: 'EUR' }).txt(totals.total.toString());
    
    return this;
  }

  addXRechnungExtension() {
    this.xml.ele('cbc:CustomizationID').txt('urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_2.2');
    return this;
  }

  addPeppolExtension() {
    this.xml.ele('cbc:CustomizationID').txt('urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0');
    return this;
  }

  build(): string {
    return this.xml.end({ prettyPrint: true });
  }
}
