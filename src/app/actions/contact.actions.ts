'use server';

import { contactService } from '@/lib/services/contact.service';
import { cookies } from 'next/headers';

export async function findAllAction(organizationId?: any) {
  return await contactService.findAll(organizationId);
}

export async function findByClientIdAction(clientId?: any, organizationId?: any) {
  return await contactService.findByClientId(clientId, organizationId);
}

export async function findByIdAction(id?: any, organizationId?: any) {
  return await contactService.findById(id, organizationId);
}

export async function createAction(data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await contactService.create(data, userId);
}

export async function updateAction(id?: any, organizationId?: any, data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await contactService.update(id, organizationId, data, userId);
}

export async function deleteAction(id?: any, organizationId?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await contactService.delete(id, organizationId, userId);
}

