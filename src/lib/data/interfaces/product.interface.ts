export interface Product {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  unitPrice: number;
  taxRate: number; // e.g., 20 for 20%
  createdAt: string;
  updatedAt: string;
}
