export interface InvoiceLine {
  id: string;
  invoiceId: string;
  productId?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // Percentage (e.g., 20 for 20%)
  discount: number; // Percentage or absolute, here we assume percentage (0-100)
}
