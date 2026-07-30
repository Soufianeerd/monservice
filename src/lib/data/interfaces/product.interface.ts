export interface Product {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  unitPrice: number;
  taxRate: number | null; // e.g., 20 for 20%
  type?: string | null;
  isActive?: boolean; // If used
  createdAt: string;
  updatedAt: string;
}
