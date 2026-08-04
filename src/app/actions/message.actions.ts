'use server';

import { messageService } from '@/lib/services/message.service';
import { cookies } from 'next/headers';

export async function getMessagesByRequestIdAction(requestId?: any) {
  return await messageService.getMessagesByRequestId(requestId);
}

export async function getConversationAction(userId1?: any, userId2?: any) {
  return await messageService.getConversation(userId1, userId2);
}

export async function findByUserAction(userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await messageService.findByUser(userId);
}

export async function getUnreadCountAction(userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await messageService.getUnreadCount(userId);
}

export async function markAsReadAction(messageIds?: any) {
  return await messageService.markAsRead(messageIds);
}

export async function markThreadAsReadAction(userId?: any, otherUserId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await messageService.markThreadAsRead(userId, otherUserId);
}

export async function createAction(data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await messageService.create(data, userId);
}

