export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  industry?: string;
  country?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}
