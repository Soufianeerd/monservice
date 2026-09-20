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

  async getById(id: string, organizationId?: string) {
    const conditions = organizationId
      ? and(eq(dataSubjectRequests.id, id), eq(dataSubjectRequests.organizationId, organizationId))
      : eq(dataSubjectRequests.id, id);
    const rows = await db.select().from(dataSubjectRequests).where(conditions).limit(1);
    return rows[0] || null;
  }

  async processRequest(
    requestId: string,
    arg2: string,
    arg3: string,
    arg4?: 'COMPLETED' | 'REJECTED' | string,
    arg5?: string
  ) {
    let organizationId: string | undefined;
    let response: string;
    let status: 'COMPLETED' | 'REJECTED';
    let processedBy: string | undefined;

    if (arg4 === 'COMPLETED' || arg4 === 'REJECTED') {
      organizationId = arg2;
      response = arg3;
      status = arg4;
      processedBy = arg5;
    } else {
      response = arg2;
      status = (arg3 === 'COMPLETED' || arg3 === 'REJECTED') ? arg3 : 'COMPLETED';
      processedBy = arg4;
    }

    const whereClause = organizationId
      ? and(eq(dataSubjectRequests.id, requestId), eq(dataSubjectRequests.organizationId, organizationId))
      : eq(dataSubjectRequests.id, requestId);

    return await db.update(dataSubjectRequests)
      .set({
        status,
        response,
        completedAt: new Date(),
        processedBy,
      })
      .where(whereClause);
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
