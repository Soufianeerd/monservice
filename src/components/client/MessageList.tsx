import { Message } from '@/lib/data/interfaces';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Conversation {
  otherUserId: string;
  otherUserName: string;
  lastMessage: Message;
  unreadCount: number;
}

export default function MessageList({ conversations, basePath = '/client/messages' }: { conversations: Conversation[], basePath?: string }) {
  return (
    <div className="divide-y divide-gray-200">
      {conversations.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          Aucune conversation pour le moment.
        </div>
      ) : (
        conversations.map(conv => (
          <Link 
            key={conv.otherUserId} 
            href={`${basePath}/${conv.otherUserId}`}
            className="block hover:bg-gray-50 transition-colors p-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {conv.otherUserName}
                </p>
                <p className={`text-sm mt-1 truncate ${conv.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                  {conv.lastMessage.content}
                </p>
              </div>
              <div className="flex flex-col items-end ml-4 flex-shrink-0">
                <span className="text-xs text-gray-500">
                  {format(new Date(conv.lastMessage.createdAt), 'PP', { locale: fr })}
                </span>
                {conv.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-1 mt-1 text-xs font-bold leading-none text-white bg-indigo-600 rounded-full">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
