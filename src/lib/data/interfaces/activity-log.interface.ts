export interface ActivityLog {
  id: string;
  userId: string;
  organizationId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
  entityType: 'CLIENT' | 'CONTACT' | 'DEAL' | 'TASK' | 'PRODUCT' | 'INVOICE' | 'TEMPLATE';
  entityId: string;
  details: string;
  createdAt: string;
}
