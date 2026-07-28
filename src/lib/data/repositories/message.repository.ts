import { Message } from '../interfaces';
import { messagesFixture } from '../fixtures';

class MessageRepository {
  private messages: Message[] = [...messagesFixture];

  async findConversation(user1Id: string, user2Id: string): Promise<Message[]> {
    return this.messages.filter(
      m => (m.senderId === user1Id && m.receiverId === user2Id) ||
           (m.senderId === user2Id && m.receiverId === user1Id)
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async findByClient(clientId: string): Promise<Message[]> {
    return this.findByUser(clientId);
  }

  async findByUser(userId: string): Promise<Message[]> {
    return this.messages.filter(m => m.senderId === userId || m.receiverId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async create(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.messages.push(newMessage);
    return newMessage;
  }

  async markAsRead(messageId: string): Promise<Message | undefined> {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.read = true;
    }
    return message;
  }

  async countUnreadForUser(userId: string): Promise<number> {
    return this.messages.filter(m => m.receiverId === userId && !m.read).length;
  }
}

export const messageRepository = new MessageRepository();
