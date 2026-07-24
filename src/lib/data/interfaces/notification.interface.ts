export type NotificationType = 
  | 'task_overdue'
  | 'task_due_soon'
  | 'invoice_overdue'
  | 'invoice_paid'
  | 'quote_viewed'
  | 'quote_accepted'
  | 'quote_refused'
  | 'deal_won'
  | 'deal_lost'
  | 'client_created'
  | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  priority: NotificationPriority;
  createdAt: string;
  organizationId: string;
  userId: string;
  metadata?: {
    entityId: string;
    entityType: 'client' | 'contact' | 'deal' | 'invoice' | 'task' | 'product';
    [key: string]: any;
  };
}
