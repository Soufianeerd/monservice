import { Notification } from '../interfaces';

export const notificationsFixture: Notification[] = [
  {
    id: 'notif-1',
    type: 'task_due_soon',
    userId: 'user-1',
    organizationId: 'org-1',
    title: 'Nouvelle tâche assignée',
    message: 'Vous avez été assigné à la tâche "Préparer contrat TechCorp".',
    isRead: false,
    priority: 'medium',
    link: '/tasks',
    metadata: { entityId: 'task-1', entityType: 'task' },
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'notif-2',
    type: 'invoice_overdue',
    userId: 'user-1',
    organizationId: 'org-1',
    title: 'Facture impayée',
    message: 'La facture F-2026-0001 est en retard de paiement.',
    isRead: false,
    priority: 'high',
    link: '/invoices/inv-1',
    metadata: { entityId: 'inv-1', entityType: 'invoice' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'notif-3',
    type: 'deal_won',
    userId: 'user-1',
    organizationId: 'org-1',
    title: 'Nouveau Deal',
    message: 'Le deal "Refonte site web" a été remporté !',
    isRead: true,
    priority: 'low',
    link: '/deals/deal-2',
    metadata: { entityId: 'deal-2', entityType: 'deal' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  }
];
