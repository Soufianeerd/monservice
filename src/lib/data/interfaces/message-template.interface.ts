export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'email' | 'sms';
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}
