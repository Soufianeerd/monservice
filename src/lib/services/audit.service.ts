import { db } from '@/lib/db/server';
import { auditLogs } from '@/lib/db/schema';
import { generateId } from '@/lib/utils/id-generator';
import { eq, sql, and } from 'drizzle-orm';

export class AuditService {
  async log(
    userId: string,
    organizationId: string,
    action: string,
    entityType: string,
    entityId?: string,
    oldValues?: any,
    newValues?: any,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    await db.insert(auditLogs).values({
      id: generateId(),
      userId,
      organizationId,
      action,
      entityType,
      entityId: entityId || 'system',
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      ip: ip || '0.0.0.0',
      userAgent: userAgent || 'unknown',
      createdAt: new Date(),
    });
  }

  async getLogs(
    organizationId: string,
    filters?: {
      userId?: string;
      action?: string;
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any[]> {
    const conditions = [eq(auditLogs.organizationId, organizationId)];
    
    if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
    if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));
    if (filters?.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
    
    if (filters?.startDate) conditions.push(sql`${auditLogs.createdAt} >= ${filters.startDate.toISOString()}`);
    if (filters?.endDate) conditions.push(sql`${auditLogs.createdAt} <= ${filters.endDate.toISOString()}`);
    
    // @ts-ignore - dynamic and conditions
    return await db.select().from(auditLogs).where(and(...conditions)).orderBy(sql`${auditLogs.createdAt} DESC`);
  }

  async exportLogs(organizationId: string, format: 'csv' | 'json'): Promise<string> {
    const logs = await this.getLogs(organizationId);
    
    if (format === 'csv') {
      const headers = ['Date', 'Utilisateur', 'Action', 'Entite', 'ID', 'Anciennes valeurs', 'Nouvelles valeurs'];
      const rows = logs.map(l => [
        l.createdAt,
        l.userId,
        l.action,
        l.entityType,
        l.entityId,
        l.oldValues,
        l.newValues
      ]);
      return [headers, ...rows].map(r => r.join(';')).join('\n');
    }
    return JSON.stringify(logs, null, 2);
  }
}
