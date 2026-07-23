import { Notification } from '../interfaces';

export const notificationsFixture: Notification[] = [
  {
    id: 'notif-1',
    userId: 'user-1',
    title: 'Nouvelle tâche assignée',
    message: 'Vous avez été assigné à la tâche "Préparer contrat TechCorp".',
    read: false,
    link: '/tasks',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
  },
  {
    id: 'notif-2',
    userId: 'user-1',
    title: 'Facture impayée',
    message: 'La facture F-2026-0001 est en retard de paiement.',
    read: false,
    link: '/invoices/inv-1',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'notif-3',
    userId: 'user-1',
    title: 'Nouveau Deal',
    message: 'Le deal "Refonte site web" a été remporté !',
    read: true,
    link: '/deals/deal-2',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  }
];
