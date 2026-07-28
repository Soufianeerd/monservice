import { Message } from '@/lib/data/interfaces';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRef, useEffect } from 'react';

export default function MessageThread({ messages, currentUserId }: { messages: Message[], currentUserId: string }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col space-y-4 p-4 h-[500px] overflow-y-auto bg-gray-50 rounded-md">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          Envoyez un message pour commencer la discussion.
        </div>
      ) : (
        messages.map((msg, idx) => {
          const isMine = msg.senderId === currentUserId;
          return (
            <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isMine ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-1 text-right ${isMine ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {format(new Date(msg.createdAt), 'HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
