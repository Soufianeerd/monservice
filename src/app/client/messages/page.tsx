'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { Card } from '@/components/ui/Card';
import { Message, User } from '@/lib/data/interfaces';

import { userService } from '@/lib/services/user.service';
import { useEffect, useState } from 'react';
import MessageList from '@/components/client/MessageList';
import { messageService } from '@/lib/services/message.service';

export default function ClientMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user?.id) return;

      const messages = await messageService.findByUser(user.id);
      
      const convosMap = new Map<string, { lastMessage: Message, unreadCount: number }>();
      
      messages.forEach(msg => {
        const otherId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
        
        if (!convosMap.has(otherId)) {
          convosMap.set(otherId, { lastMessage: msg, unreadCount: 0 });
        }
        
        if (msg.receiverId === user.id && !msg.read) {
          convosMap.get(otherId)!.unreadCount++;
        }
      });

      const formattedConvos = await Promise.all(
        Array.from(convosMap.entries()).map(async ([otherId, data]) => {
          const otherUser = await userService.getUserProfile(otherId);
          return {
            otherUserId: otherId,
            otherUserName: otherUser?.name || 'Utilisateur inconnu',
            lastMessage: data.lastMessage,
            unreadCount: data.unreadCount
          };
        })
      );

      formattedConvos.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
      setConversations(formattedConvos);
    };

    fetchConversations();
  }, [user]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messagerie</h1>
        <p className="text-gray-500">Échangez avec les professionnels.</p>
      </div>

      <Card>
        <MessageList conversations={conversations} />
      </Card>
    </div>
  );
}
