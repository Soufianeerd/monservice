export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  isPrimary?: boolean;
  clientId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}
