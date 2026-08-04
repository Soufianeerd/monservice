'use server';

import { taskService } from '@/lib/services/task.service';
import { cookies } from 'next/headers';

export async function findAllAction(organizationId?: any) {
  return await taskService.findAll(organizationId);
}

export async function findByOrganizationAction(organizationId?: any) {
  return await taskService.findByOrganization(organizationId);
}

export async function findByIdAction(id?: any, organizationId?: any) {
  return await taskService.findById(id, organizationId);
}

export async function findByEntityAction(entityType?: any, entityId?: any, organizationId?: any) {
  return await taskService.findByEntity(entityType, entityId, organizationId);
}

export async function createAction(data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await taskService.create(data, userId);
}

export async function updateAction(id?: any, organizationId?: any, data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await taskService.update(id, organizationId, data, userId);
}

export async function markAsDoneAction(id?: any, organizationId?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await taskService.markAsDone(id, organizationId, userId);
}

export async function deleteAction(id?: any, organizationId?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await taskService.delete(id, organizationId, userId);
}

