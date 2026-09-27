export type InvoiceLineType =
  | 'service'
  | 'labor'
  | 'material'
  | 'equipment'
  | 'travel'
  | 'subcontracting'
  | 'other';

export type InvoiceUnitCode =
  | 'unit'
  | 'hour'
  | 'day'
  | 'meter'
  | 'linear_meter'
  | 'square_meter'
  | 'cubic_meter'
  | 'kilogram'
  | 'liter'
  | 'package'
  | 'fixed_price';

export interface InvoiceLine {
  id: string;
  organizationId?: string;
  invoiceId: string;
  sectionId?: string | null;
  sourceLineId?: string | null;
  productId?: string | null;
  description: string;
  lineType?: InvoiceLineType;
  unitCode?: InvoiceUnitCode;
  position?: number;
  quantity: number;
  unitPrice: number;
  discountRate?: number;
  unitCost?: number | null;
  taxRate: number;
  taxAmount?: number;
  totalHT: number;
  totalTTC: number;
  discount?: number; // legacy alias
}
