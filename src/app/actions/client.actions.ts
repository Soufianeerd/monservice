'use server';

import { clientService } from '@/lib/services/client.service';
import { cookies } from 'next/headers';

export async function findAllAction(organizationId?: any) {
  return await clientService.findAll(organizationId);
}

export async function findByIdAction(id?: any, organizationId?: any) {
  return await clientService.findById(id, organizationId);
}

export async function createAction(data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await clientService.create(data, userId);
}

export async function updateAction(id?: any, organizationId?: any, data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await clientService.update(id, organizationId, data, userId);
}

export async function deleteWithCascadeAction(id?: any, organizationId?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await clientService.deleteWithCascade(id, organizationId, userId);
}

