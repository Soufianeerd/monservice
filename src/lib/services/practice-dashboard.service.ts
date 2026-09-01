import { db } from '../db/server';
import { tasks } from '../db/schema';
import { and, eq, notInArray } from 'drizzle-orm';
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

    const openTasksQuery = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        status: tasks.status,
        priority: tasks.priority,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.organizationId, organizationId),
          notInArray(tasks.status, ['completed', 'cancelled'])
        )
      );

    const openTaskCount = openTasksQuery.length;

    // Sort tasks in memory to ensure consistent behavior across environments
    // and handle custom priority weighting cleanly.
    const sortedTasks = [...openTasksQuery].sort((a, b) => {
      // 1. Due date presence (dates first)
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      // 2. Due date ascending
      if (a.dueDate && b.dueDate) {
        if (a.dueDate < b.dueDate) return -1;
        if (a.dueDate > b.dueDate) return 1;
      }

      // 3. Priority (high > medium > low)
      const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const aWeight = priorityWeight[a.priority || 'medium'] || 0;
      const bWeight = priorityWeight[b.priority || 'medium'] || 0;
      
      if (aWeight > bWeight) return -1;
      if (aWeight < bWeight) return 1;

      // 4. Stable fallback
      return a.id.localeCompare(b.id);
    });

    const nextTasks = sortedTasks.slice(0, 5);

    return {
      openTaskCount,
      nextTasks,
    };
  }
};
