'use server';

import { dealService } from '@/lib/services/deal.service';
import { cookies } from 'next/headers';

export async function findAllAction(organizationId?: any) {
  return await dealService.findAll(organizationId);
}

export async function findByClientIdAction(clientId?: any, organizationId?: any) {
  return await dealService.findByClientId(clientId, organizationId);
}

export async function findByIdAction(id?: any, organizationId?: any) {
  return await dealService.findById(id, organizationId);
}

export async function createAction(data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await dealService.create(data, userId);
}

export async function updateAction(id?: any, organizationId?: any, data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await dealService.update(id, organizationId, data, userId);
}

export async function updateStatusAction(id?: any, status?: any, organizationId?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await dealService.updateStatus(id, status, organizationId, userId);
}

export async function deleteAction(id?: any, organizationId?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await dealService.delete(id, organizationId, userId);
}

