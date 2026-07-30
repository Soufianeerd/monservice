import { taskService } from '@/lib/services/task.service';
import { notificationRepository, invoiceRepository, dealRepository } from '@/lib/data';
import { generateId } from '@/lib/utils/id-generator';
import { Notification, NotificationType } from '@/lib/data/interfaces';

export class NotificationService {
  async generateNotifications(organizationId: string): Promise<void> {
    const now = new Date();

    // Récupérer toutes les entités de l'organisation
    const [tasks, invoices, deals] = await Promise.all([
      taskService.findByOrganization(organizationId),
      invoiceRepository.findByOrganization(organizationId),
      dealRepository.findByOrganization(organizationId),
    ]);

    const notifications: Omit<Notification, 'id'>[] = [];

    // 1. Tâches en retard
    for (const task of tasks) {
      if (task.status === 'Terminé' || task.status === 'cancelled' as any) continue;
      if (!task.dueDate) continue;
      
      const dueDate = new Date(task.dueDate);
      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        notifications.push({
          type: 'task_overdue',
          title: `Tâche en retard : ${task.title}`,
          message: `Cette tâche est en retard de ${diffDays} jour${diffDays > 1 ? 's' : ''}.`,
          link: `/tasks`,
          isRead: false,
          priority: 'high',
          createdAt: new Date().toISOString(),
          organizationId,
          userId: task.assignedTo || '',
          metadata: { entityId: task.id, entityType: 'task' },
        });
      } else if (diffDays >= -1 && diffDays <= 0) {
        // Tâche arrivant à échéance dans moins de 24h
        notifications.push({
          type: 'task_due_soon',
          title: `Tâche à échéance : ${task.title}`,
          message: `Cette tâche est due demain.`,
          link: `/tasks`,
          isRead: false,
          priority: 'medium',
          createdAt: new Date().toISOString(),
          organizationId,
          userId: task.assignedTo || '',
          metadata: { entityId: task.id, entityType: 'task' },
        });
      }
    }

    // 2. Factures impayées en retard
    for (const invoice of invoices) {
      if (invoice.status === 'paid' || invoice.status === 'cancelled') continue;
      if (!invoice.date) continue;
      
      // En l'absence de dueDate, utilisons la date d'émission + 30 jours (pour l'exemple) si non précisé
      let dueDate = invoice.dueDate ? new Date(invoice.dueDate) : new Date(invoice.date);
      if (!invoice.dueDate) dueDate.setDate(dueDate.getDate() + 30);

      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        notifications.push({
          type: 'invoice_overdue',
          title: `Facture impayée : ${invoice.number}`,
          message: `Cette facture de ${invoice.totalTTC}€ est en retard de ${diffDays} jour${diffDays > 1 ? 's' : ''}.`,
          link: `/invoices/${invoice.id}`,
          isRead: false,
          priority: 'high',
          createdAt: new Date().toISOString(),
          organizationId,
          userId: '', // notification globale
          metadata: { entityId: invoice.id, entityType: 'invoice' },
        });
      }
    }

    // 3. Deals gagnés ou perdus récemment (dans les 7 derniers jours)
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    for (const deal of deals) {
      if (!deal.createdAt) continue; // fallback since updatedAt might not be available
      const updatedAt = deal.updatedAt ? new Date(deal.updatedAt) : new Date(deal.createdAt);
      if (updatedAt < oneWeekAgo) continue;
      
      if (deal.status === 'won') {
        notifications.push({
          type: 'deal_won',
          title: `Deal gagné : ${deal.name}`,
          message: `Le deal de ${deal.value}€ a été remporté.`,
          link: `/deals/${deal.id}`,
          isRead: false,
          priority: 'medium',
          createdAt: new Date().toISOString(),
          organizationId,
          userId: '',
          metadata: { entityId: deal.id, entityType: 'deal' },
        });
      } else if (deal.status === 'lost') {
        notifications.push({
          type: 'deal_lost',
          title: `Deal perdu : ${deal.name}`,
          message: `Le deal de ${deal.value}€ a été perdu.`,
          link: `/deals/${deal.id}`,
          isRead: false,
          priority: 'medium',
          createdAt: new Date().toISOString(),
          organizationId,
          userId: '',
          metadata: { entityId: deal.id, entityType: 'deal' },
        });
      }
    }

    // Enregistrer les notifications (éviter les doublons en vérifiant les 24 dernières heures)
    const existingNotifications = await notificationRepository.findByOrganization(organizationId);
    const existingKeys = new Set(
      existingNotifications
        .filter(n => {
          const createdAt = new Date(n.createdAt);
          return (now.getTime() - createdAt.getTime()) < 24 * 60 * 60 * 1000;
        })
        .map(n => `${n.type}_${n.metadata?.entityId || ''}`)
    );

    for (const notif of notifications) {
      const key = `${notif.type}_${notif.metadata?.entityId || ''}`;
      if (!existingKeys.has(key)) {
        await notificationRepository.create({
          ...notif,
        });
      }
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = await notificationRepository.getById(notificationId);
    if (notification) {
      await notificationRepository.update(notificationId, { ...notification, isRead: true });
    }
  }

  async markAllAsRead(organizationId: string, userId: string): Promise<void> {
    await notificationRepository.markAllAsRead(organizationId, userId);
  }

  async getUnreadCount(organizationId: string, userId: string): Promise<number> {
    return notificationRepository.getUnreadCount(organizationId, userId);
  }
}

export const notificationService = new NotificationService();
