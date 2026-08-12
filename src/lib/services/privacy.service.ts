import { db } from '@/lib/db/server';
import { consentEvents, processingActivities } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils/id-generator';

export class PrivacyService {
  async recordConsent(userId: string, organizationId: string, consentType: string, value: boolean, metadata: any) {
    await db.insert(consentEvents).values({
      id: generateId(),
      userId,
      organizationId,
      consentType,
      consentValue: value ? 'true' : 'false',
      legalBasis: metadata.legalBasis || 'consent',
      source: metadata.source || 'manual',
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      policyVersion: metadata.policyVersion || '1.0',
      timestamp: new Date(),
    });
  }

  async getConsentHistory(userId: string, consentType?: string) {
    let events;
    if (consentType) {
      events = await db.select().from(consentEvents)
        .where(and(eq(consentEvents.userId, userId), eq(consentEvents.consentType, consentType)))
        .orderBy(consentEvents.timestamp);
    } else {
      events = await db.select().from(consentEvents)
        .where(eq(consentEvents.userId, userId))
        .orderBy(consentEvents.timestamp);
    }

    return events.map(e => ({
      ...e,
      consentValue: e.consentValue === 'true'
    }));
  }

  async getProcessingActivities(organizationId: string) {
    return await db.select().from(processingActivities)
      .where(eq(processingActivities.organizationId, organizationId));
  }

  async createProcessingActivity(organizationId: string, data: any) {
    const newActivity = {
      id: generateId(),
      organizationId,
      name: data.name,
      purpose: data.purpose,
      dataCategories: data.dataCategories ? JSON.stringify(data.dataCategories) : null,
      legalBasis: data.legalBasis,
      retentionPeriod: data.retentionPeriod,
      dataSubjects: data.dataSubjects ? JSON.stringify(data.dataSubjects) : null,
      transfers: data.transfers,
      securityMeasures: data.securityMeasures,
      responsible: data.responsible,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.insert(processingActivities).values(newActivity);
    return newActivity;
  }

  async exportRegisterCSV(organizationId: string): Promise<string> {
    const activities = await this.getProcessingActivities(organizationId);
    
    if (activities.length === 0) {
      return "Name,Purpose,Legal Basis,Retention Period,Responsible\n";
    }

    const headers = ["Name", "Purpose", "Legal Basis", "Retention Period", "Responsible"];
    
    const rows = activities.map(a => {
      return [
        `"${(a.name || '').replace(/"/g, '""')}"`,
        `"${(a.purpose || '').replace(/"/g, '""')}"`,
        `"${(a.legalBasis || '').replace(/"/g, '""')}"`,
        `"${(a.retentionPeriod || '').replace(/"/g, '""')}"`,
        `"${(a.responsible || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const privacyService = new PrivacyService();
