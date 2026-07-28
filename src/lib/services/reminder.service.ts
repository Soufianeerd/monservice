import { invoiceRepository } from '@/lib/data/repositories/invoice.repository';
import { reminderRepository, reminderSettingsRepository } from '@/lib/data/repositories/reminder.repository';
import { Reminder } from '@/lib/data/interfaces/reminder.interface';
import { v4 as uuidv4 } from 'uuid';

export async function checkAndSendReminders(organizationId: string) {
  const now = new Date();
  const remindersToSend: Reminder[] = [];

  const settings = await reminderSettingsRepository.getByOrganizationId(organizationId);
  if (!settings) return; // No settings, no reminders

  // We check Invoices (both type invoice and quote)
  const invoices = await invoiceRepository.findByOrganization(organizationId);

  for (const invoice of invoices) {
    if (invoice.type === 'invoice' && settings.invoiceOverdueEnabled) {
      if (invoice.status === 'sent' || invoice.status === 'overdue') {
        if (invoice.dueDate) {
          const dueDate = new Date(invoice.dueDate);
          const diffTime = now.getTime() - dueDate.getTime();
          const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (daysOverdue > 0) {
            for (const day of settings.invoiceOverdueDays) {
              if (daysOverdue >= day) {
                const alreadySent = await reminderRepository.hasReminderBeenSent(invoice.id, 'invoice_overdue', day);
                if (!alreadySent) {
                  remindersToSend.push({
                    id: uuidv4(),
                    type: 'invoice_overdue',
                    entityId: invoice.id,
                    organizationId,
                    daysOffset: day,
                    sentAt: now.toISOString(),
                  });
                }
              }
            }
          }
        }
      }
    }

    if (invoice.type === 'quote') {
      if ((invoice.status === 'sent' || invoice.status === 'viewed') && settings.quoteReminderEnabled) {
        const sentDate = new Date(invoice.createdAt); // assuming sent on creation for simplicity
        const diffTime = now.getTime() - sentDate.getTime();
        const daysSinceSent = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        for (const day of settings.quoteReminderDays) {
          if (daysSinceSent >= day) {
            const alreadySent = await reminderRepository.hasReminderBeenSent(invoice.id, 'quote_reminder', day);
            if (!alreadySent) {
              remindersToSend.push({
                id: uuidv4(),
                type: 'quote_reminder',
                entityId: invoice.id,
                organizationId,
                daysOffset: day,
                sentAt: now.toISOString(),
              });
            }
          }
        }
      }

      if ((invoice.status === 'sent' || invoice.status === 'viewed') && settings.quoteExpiringEnabled) {
        if (invoice.dueDate) { // dueDate serves as expectedCloseDate for quotes
          const dueDate = new Date(invoice.dueDate);
          const diffTime = dueDate.getTime() - now.getTime();
          const daysUntilExpiring = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (daysUntilExpiring <= settings.quoteExpiringDays && daysUntilExpiring > 0) {
            const alreadySent = await reminderRepository.hasReminderBeenSent(invoice.id, 'quote_expiring', settings.quoteExpiringDays);
            if (!alreadySent) {
              remindersToSend.push({
                id: uuidv4(),
                type: 'quote_expiring',
                entityId: invoice.id,
                organizationId,
                daysOffset: settings.quoteExpiringDays, // positive means before
                sentAt: now.toISOString(),
              });
            }
          }
        }
      }
    }
  }

  // Simulate sending and save
  for (const reminder of remindersToSend) {
    console.log(`[RELANCE] Envoi relance (${reminder.type}) pour l'entité ${reminder.entityId} (Offset: ${reminder.daysOffset}j)`);
    await reminderRepository.create(reminder);
  }

  return remindersToSend;
}
