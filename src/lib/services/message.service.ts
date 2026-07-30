import { db } from '../db';
import { messages } from '../db/schema';
import { eq, and, or } from 'drizzle-orm';
import { Message } from '../data/interfaces/message.interface';
import { generateId } from '../utils/id-generator';


export const messageService = {
  async getMessagesByRequestId(requestId: string): Promise<Message[]> {
    const results = await db.select().from(messages).where(eq(messages.requestId, requestId));
    return results.map(r => ({
      ...r,
      read: r.isRead || false,
      requestId: r.requestId || undefined,
    }));
  },

  async getConversation(userId1: string, userId2: string): Promise<Message[]> {
    const results = await db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      )
    ).orderBy(messages.createdAt);
    
    return results.map(r => ({
      ...r,
      read: r.isRead || false,
      requestId: r.requestId || undefined,
    }));
  },

  async findByUser(userId: string): Promise<Message[]> {
    const results = await db.select().from(messages).where(
      or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
    ).orderBy(messages.createdAt);
    
    return results.map(r => ({
      ...r,
      read: r.isRead || false,
      requestId: r.requestId || undefined,
    }));
  },

  async getUnreadCount(userId: string): Promise<number> {
    const results = await db.select().from(messages).where(
      and(eq(messages.receiverId, userId), eq(messages.isRead, false))
    );
    return results.length;
  },

  async markAsRead(messageIds: string[]): Promise<void> {
    for (const id of messageIds) {
      await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
    }
  },

  async create(data: Omit<Message, 'id' | 'createdAt' | 'read'>): Promise<Message> {
    const id = generateId();
    const now = new Date().toISOString();
    
    await db.insert(messages).values({
      id,
      senderId: data.senderId,
      receiverId: data.receiverId,
      content: data.content,
      requestId: data.requestId || null,
      organizationId: data.organizationId,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    });
    
    const result = await db.select().from(messages).where(eq(messages.id, id));
    return {
      ...result[0],
      read: result[0].isRead || false,
      requestId: result[0].requestId || undefined,
    };
  }
};
