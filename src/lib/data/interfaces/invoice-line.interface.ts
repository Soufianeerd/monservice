export interface InvoiceLine {
  id: string;
  invoiceId: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  totalHT: number;
  totalTTC: number;
  discount?: number; // Optional since it's not in schema
}
