import { db } from '@/lib/db/server';
import { breachNotifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils/id-generator';

export class BreachService {
  async reportBreach(organizationId: string, data: any) {
    const breach = {
      id: generateId(),
      organizationId,
      title: data.title,
      description: data.description,
      discoveryDate: data.discoveryDate ? new Date(data.discoveryDate) : new Date(),
      startDate: data.startDate ? new Date(data.startDate) : null,
      dataCategories: data.dataCategories,
      affectedIndividuals: data.affectedIndividuals,
      riskLevel: data.riskLevel,
      correctiveActions: data.correctiveActions,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.insert(breachNotifications).values(breach);
    return breach;
  }

  async getBreaches(organizationId: string) {
    return await db.select().from(breachNotifications)
      .where(eq(breachNotifications.organizationId, organizationId))
      .orderBy(breachNotifications.discoveryDate);
  }

  async updateBreachStatus(id: string, status: string, actions?: string) {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };
    if (actions) {
      updateData.correctiveActions = actions;
    }

    return await db.update(breachNotifications)
      .set(updateData)
      .where(eq(breachNotifications.id, id));
  }

  async markAsNotified(id: string) {
    return await db.update(breachNotifications)
      .set({
        notifiedAuthority: true,
        notificationDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(breachNotifications.id, id));
  }

  async getPendingNotifications(organizationId: string) {
    return await db.select().from(breachNotifications)
      .where(and(
        eq(breachNotifications.organizationId, organizationId),
        eq(breachNotifications.notifiedAuthority, false),
        eq(breachNotifications.riskLevel, 'high')
      ));
  }
}

export const breachService = new BreachService();
