import { db } from '../db/server';
import { withReadScope } from '../db/read-scope';
import { tasks } from '../db/schema';
import { and, eq, notInArray, sql, asc } from 'drizzle-orm';
import { AppError } from '../errors';

export interface PracticeDashboardTask {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  priority: string | null;
}

export interface PracticeDashboardData {
  openTaskCount: number;
  nextTasks: readonly PracticeDashboardTask[];
}

export const practiceDashboardService = {
  async getOverview(organizationId: string): Promise<PracticeDashboardData> {
    if (!organizationId) {
      throw new AppError('Organization ID is required', 400, 'BAD_REQUEST');
    }

    const baseWhere = and(
      eq(tasks.organizationId, organizationId),
      notInArray(tasks.status, ['completed', 'cancelled'])
    );

    const countQuery = db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(tasks)
      .where(baseWhere);

    const topTasksQuery = db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        status: tasks.status,
        priority: tasks.priority,
      })
      .from(tasks)
      .where(baseWhere)
      .orderBy(
        sql`${tasks.dueDate} ASC NULLS LAST`,
        sql`CASE 
          WHEN ${tasks.priority} = 'high' THEN 1 
          WHEN ${tasks.priority} = 'medium' THEN 2 
          WHEN ${tasks.priority} = 'low' THEN 3 
          ELSE 4 
        END ASC`,
        asc(tasks.id)
      )
      .limit(5);

    // Une transaction pour les deux lectures : elles partent en pipeline.
    const [[{ count }], nextTasks] = await withReadScope(() => Promise.all([
      countQuery,
      topTasksQuery
    ]));

    return {
      openTaskCount: count,
      nextTasks,
    };
  }
};
