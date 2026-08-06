import { db } from '../db/server';
import { messages } from '../db/schema';
import { eq, and, or } from 'drizzle-orm';
import { Message } from '../data/interfaces/message.interface';
import { generateId } from '../utils/id-generator';
import { messageSchema } from '../validation/schemas';
import { AppError } from '@/lib/errors';
import { userService } from './user.service';

export const messageService = {
  async getMessagesByRequestId(requestId: string): Promise<Message[]> {
    const results = await db.select().from(messages).where(eq(messages.requestId, requestId));
    return results.map(r => ({
      ...r,
      read: r.isRead || false,
      requestId: r.requestId || undefined,
    }));
  },

  /**
   * Messages d'une demande, restreints à ceux auxquels l'utilisateur participe.
   *
   * L'ancienne méthode `getMessagesByRequestId` renvoyait tout le fil à
   * quiconque connaissait l'identifiant de la demande (anomalie MS-027).
   */
  async getMessagesByRequestIdForUser(requestId: string, userId: string): Promise<Message[]> {
    if (!requestId || !userId) return [];

    const results = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.requestId, requestId),
          or(eq(messages.senderId, userId), eq(messages.receiverId, userId)),
        ),
      )
      .orderBy(messages.createdAt);

    return results.map((r) => ({
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

  /**
   * Marque des messages comme lus.
   *
   * Le `receiverId` est imposé : on ne peut marquer comme lus que les
   * messages dont on est destinataire. L'ancienne version acceptait une liste
   * d'identifiants arbitraires (anomalie MS-027).
   */
  async markAsRead(messageIds: string[], receiverId: string): Promise<void> {
    if (!receiverId || !Array.isArray(messageIds) || messageIds.length === 0) return;

    for (const id of messageIds) {
      await db
        .update(messages)
        .set({ isRead: true, updatedAt: new Date().toISOString() })
        .where(and(eq(messages.id, id), eq(messages.receiverId, receiverId)));
    }
  },

  async markThreadAsRead(userId: string, otherUserId: string): Promise<void> {
    // Mark as read all messages where the current user is the receiver and the other user is the sender
    await db.update(messages)
      .set({ isRead: true, updatedAt: new Date().toISOString() })
      .where(and(eq(messages.receiverId, userId), eq(messages.senderId, otherUserId), eq(messages.isRead, false)));
  },

  async create(data: Omit<Message, 'id' | 'createdAt' | 'read'>, userId: string): Promise<Message> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.id !== data.senderId) {
      throw new AppError('Unauthorized to send message as this user', 403, 'UNAUTHORIZED');
    }

    const validated = messageSchema.parse(data);

    const id = generateId();
    const now = new Date().toISOString();
    
    await db.insert(messages).values({
      id,
      senderId: validated.senderId,
      receiverId: validated.receiverId,
      content: validated.content,
      requestId: validated.requestId || null,
      organizationId: validated.organizationId,
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
