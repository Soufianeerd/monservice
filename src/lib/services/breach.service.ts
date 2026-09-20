import { db } from '@/lib/db/server';
import { breachNotifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils/id-generator';

export interface BreachInput {
  title: string;
  description: string;
  discoveryDate?: string | Date;
  startDate?: string | Date | null;
  dataCategories?: string[] | string | null;
  affectedIndividuals?: number;
  riskLevel?: string;
  correctiveActions?: string | null;
}

export class BreachService {
  async reportBreach(organizationId: string, data: BreachInput) {
    const categoriesStr = Array.isArray(data.dataCategories)
      ? data.dataCategories.join(', ')
      : (typeof data.dataCategories === 'string' ? data.dataCategories : null);

    const breach = {
      id: generateId(),
      organizationId,
      title: data.title,
      description: data.description,
      discoveryDate: data.discoveryDate ? new Date(data.discoveryDate) : new Date(),
      startDate: data.startDate ? new Date(data.startDate) : null,
      dataCategories: categoriesStr,
      affectedIndividuals: data.affectedIndividuals ?? 0,
      riskLevel: data.riskLevel ?? 'low',
      correctiveActions: data.correctiveActions ?? null,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.insert(breachNotifications).values(breach);
    return breach;
  }

  async getById(id: string, organizationId?: string) {
    const conditions = organizationId
      ? and(eq(breachNotifications.id, id), eq(breachNotifications.organizationId, organizationId))
      : eq(breachNotifications.id, id);
    const rows = await db.select().from(breachNotifications).where(conditions).limit(1);
    return rows[0] || null;
  }

  async getBreaches(organizationId: string) {
    return await db.select().from(breachNotifications)
      .where(eq(breachNotifications.organizationId, organizationId))
      .orderBy(breachNotifications.discoveryDate);
  }

  async updateBreachStatus(id: string, organizationId: string, status: string, actions?: string) {
    const updateData: { status: string; updatedAt: Date; correctiveActions?: string } = { 
      status, 
      updatedAt: new Date() 
    };
    if (actions !== undefined) {
      updateData.correctiveActions = actions;
    }

    return await db.update(breachNotifications)
      .set(updateData)
      .where(and(eq(breachNotifications.id, id), eq(breachNotifications.organizationId, organizationId)));
  }

  async markAsNotified(id: string, organizationId?: string) {
    const condition = organizationId
      ? and(eq(breachNotifications.id, id), eq(breachNotifications.organizationId, organizationId))
      : eq(breachNotifications.id, id);

    return await db.update(breachNotifications)
      .set({
        notifiedAuthority: true,
        notificationDate: new Date(),
        updatedAt: new Date()
      })
      .where(condition);
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
