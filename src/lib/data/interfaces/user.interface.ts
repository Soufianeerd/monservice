export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'member';
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}
