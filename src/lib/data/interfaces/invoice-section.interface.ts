export type InvoiceSectionKind = 'lot' | 'tranche' | 'section' | 'option' | 'variant';

export interface InvoiceSection {
  id: string;
  organizationId: string;
  invoiceId: string;
  parentSectionId?: string | null;
  kind: InvoiceSectionKind;
  title: string;
  description?: string | null;
  position: number;
  isOptional: boolean;
  optionGroupKey?: string | null;
  isSelected: boolean;
  createdAt: string;
  updatedAt: string;
}
