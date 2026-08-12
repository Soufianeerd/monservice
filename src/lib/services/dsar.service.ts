import { db } from '@/lib/db/server';
import { dataSubjectRequests } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { generateId } from '@/lib/utils/id-generator';

export class DSARService {
  async createRequest(userId: string, organizationId: string, type: string, details: string) {
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days
    
    const request = {
      id: generateId(),
      userId,
      organizationId,
      requestType: type,
      status: 'RECEIVED',
      requestDetails: details,
      receivedAt: new Date(),
      deadline,
    };

    await db.insert(dataSubjectRequests).values(request);
    return request;
  }

  async processRequest(requestId: string, response: string, status: 'COMPLETED' | 'REJECTED', processedBy?: string) {
    return await db.update(dataSubjectRequests)
      .set({
        status,
        response,
        completedAt: new Date(),
        processedBy,
      })
      .where(eq(dataSubjectRequests.id, requestId));
  }

  async getRequests(organizationId: string) {
    return await db.select().from(dataSubjectRequests)
      .where(eq(dataSubjectRequests.organizationId, organizationId))
      .orderBy(dataSubjectRequests.receivedAt);
  }

  async getOverdueRequests(organizationId: string) {
    return await db.select().from(dataSubjectRequests)
      .where(and(
        eq(dataSubjectRequests.organizationId, organizationId),
        eq(dataSubjectRequests.status, 'RECEIVED'),
        sql`${dataSubjectRequests.deadline} < NOW()`
      ));
  }
}

export const dsarService = new DSARService();
