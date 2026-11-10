import { taskUpdateSchema } from '@/lib/validation/core-update.schemas';
import { requireCoreUpdateActor, requireCoreRelation } from './core-update-authorization';
import { db } from '../db/server';
import { tasks } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '../utils/id-generator';
import { Task } from '../data/interfaces';
import type { TaskEntityType, TaskPriority, TaskStatus } from '../data/interfaces/task.interface';

// Les colonnes ne portent pas de contrainte SQL : on normalise à la lecture,
// sans cast, avec un repli explicite pour les valeurs historiques inconnues.
const TASK_STATUSES: readonly TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled', 'todo'];
const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high'];
const TASK_ENTITY_TYPES: readonly Exclude<TaskEntityType, null>[] = ['client', 'contact', 'deal', 'invoice', 'quote'];

function toTaskStatus(value: string): TaskStatus {
  return TASK_STATUSES.find((status) => status === value) ?? 'todo';
}
function toTaskPriority(value: string | null): TaskPriority {
  return TASK_PRIORITIES.find((priority) => priority === value) ?? 'medium';
}
function toTaskEntityType(value: string | null): TaskEntityType | undefined {
  return TASK_ENTITY_TYPES.find((type) => type === value);
}
import { taskSchema } from '../validation/schemas';
import { AppError } from '@/lib/errors';
import { userService } from './user.service';

export const taskService = {
  async findAll(organizationId: string): Promise<Task[]> {
    const results = await db.select().from(tasks).where(eq(tasks.organizationId, organizationId));
    return results.map(r => ({ ...r, status: toTaskStatus(r.status), priority: toTaskPriority(r.priority), entityType: toTaskEntityType(r.entityType), entityId: r.entityId || undefined, assignedTo: r.assignedTo || undefined, description: r.description || '', dueDate: r.dueDate || '' }));
  },

  async findByOrganization(organizationId: string): Promise<Task[]> {
    return this.findAll(organizationId);
  },

  async findById(id: string, organizationId: string): Promise<Task | null> {
    const result = await db.select().from(tasks).where(
      and(eq(tasks.id, id), eq(tasks.organizationId, organizationId))
    );
    if (!result[0]) return null;
    return { ...result[0], status: toTaskStatus(result[0].status), priority: toTaskPriority(result[0].priority), entityType: toTaskEntityType(result[0].entityType), entityId: result[0].entityId || undefined, assignedTo: result[0].assignedTo || undefined, description: result[0].description || '', dueDate: result[0].dueDate || '' };
  },

  async findByEntity(entityType: string, entityId: string, organizationId: string): Promise<Task[]> {
    const results = await db.select().from(tasks).where(
      and(eq(tasks.entityType, entityType), eq(tasks.entityId, entityId), eq(tasks.organizationId, organizationId))
    );
    return results.map(r => ({ ...r, status: toTaskStatus(r.status), priority: toTaskPriority(r.priority), entityType: toTaskEntityType(r.entityType), entityId: r.entityId || undefined, assignedTo: r.assignedTo || undefined, description: r.description || '', dueDate: r.dueDate || '' }));
  },

  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Task> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== data.organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const validated = taskSchema.parse(data);
    const now = new Date().toISOString();
    const newTask = {
      id: generateId(),
      ...validated,
      entityId: data.entityId || null,
      assignedTo: data.assignedTo || null,
      description: data.description || null,
      entityType: data.entityType || null,
      dueDate: data.dueDate || null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(tasks).values(newTask);
    return this.findById(newTask.id, data.organizationId) as Promise<Task>;
  },

  async update(id: string, organizationId: string, data: Partial<Task>, userId: string): Promise<Task | null> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const validated = taskUpdateSchema.parse(data);
    await db.transaction(async (tx) => {
      await requireCoreUpdateActor(tx, organizationId, userId);
      const [existing] = await tx.select().from(tasks).where(and(eq(tasks.id,id),eq(tasks.organizationId,organizationId))).limit(1).for('update');
      if (!existing) return null;
      if (validated.assignedTo) await requireCoreRelation(tx,organizationId,'user',validated.assignedTo);
      const entityType = validated.entityType !== undefined ? validated.entityType : existing.entityType;
      const entityId = validated.entityId !== undefined ? validated.entityId : existing.entityId;
      if (entityId) {
        if (!entityType) throw new AppError('Type de relation requis',400,'INVALID_RELATION');
        await requireCoreRelation(tx,organizationId,entityType,entityId);
      }
      await tx.update(tasks).set({ ...validated, updatedAt: new Date().toISOString() }).where(and(eq(tasks.id,id),eq(tasks.organizationId,organizationId)));
    });
    return this.findById(id, organizationId);
  },

  async markAsDone(id: string, organizationId: string, userId: string): Promise<Task | null> {
    return this.update(id, organizationId, { status: 'completed' }, userId);
  },

  async delete(id: string, organizationId: string, userId: string): Promise<void> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.organizationId, organizationId)));
  },
};
