'use server';

import { requestService } from '@/lib/services/request.service';
import { cookies } from 'next/headers';

export async function findAllAction() {
  return await requestService.findAll();
}

export async function findPublicAction() {
  return await requestService.findPublic();
}

export async function findByIdAction(id?: any) {
  return await requestService.findById(id);
}

export async function findByClientIdAction(clientId?: any) {
  return await requestService.findByClientId(clientId);
}

export async function createAction(data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await requestService.create(data, userId);
}

export async function updateAction(id?: any, data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await requestService.update(id, data, userId);
}

export async function publishAction(id?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await requestService.publish(id, userId);
}

export async function deleteAction(id?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await requestService.delete(id, userId);
}

