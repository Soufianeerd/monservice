'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardBody } from '@/components/ui/Card';
import { Message, User } from '@/lib/data/interfaces';
import { messageRepository } from '@/lib/data/repositories';
import { userService } from '@/lib/services/user.service';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import MessageThread from '@/components/client/MessageThread';
import { SendIcon } from 'lucide-react';
import Link from 'next/link';

export default function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const otherUserId = resolvedParams.id;
  const { user } = useAuth();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      const u = await userService.getUserProfile(otherUserId);
      if (u) setOtherUser(u);

      const msgs = await messageRepository.findConversation(user.id, otherUserId);
      setMessages(msgs);

      // Mark as read
      for (const msg of msgs) {
        if (msg.receiverId === user.id && !msg.read) {
          await messageRepository.markAsRead(msg.id);
        }
      }
    };
    fetchData();
  }, [otherUserId, user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.id) return;

    const msg = await messageRepository.create({
      senderId: user.id,
      receiverId: otherUserId,
      content: newMessage.trim(),
      read: false,
      organizationId: '' // We assume it is populated differently or left empty for direct messages
    });

    setMessages([...messages, msg]);
    setNewMessage('');
  };

  if (!otherUser) return <div>Chargement...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex items-center space-x-4">
        <Link href="/client/messages" className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
          &larr; Retour
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{otherUser.name}</h1>
      </div>

      <Card className="flex-1 flex flex-col shadow-sm">
        <CardBody>
          <div className="flex flex-col h-[600px]">
            {user?.id && (
              <div className="flex-1 overflow-hidden">
                <MessageThread messages={messages} currentUserId={user.id} />
              </div>
            )}
            
            <form onSubmit={handleSend} className="mt-4 flex space-x-3 border-t border-gray-200 pt-4">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Écrivez votre message..."
                className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </form>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
