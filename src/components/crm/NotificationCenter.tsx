'use client';

import React from 'react';
import Link from 'next/link';
import { Notification } from '@/lib/data/interfaces';
import { Bell, Check, Clock } from 'lucide-react';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationCenter({ notifications, onMarkAsRead, onMarkAllAsRead }: NotificationCenterProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 24h
    if (diff < 1000 * 60 * 60 * 24) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const mins = Math.floor(diff / (1000 * 60));
        return `Il y a ${mins} min`;
      }
      return `Il y a ${hours} h`;
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-white shadow-lg rounded-lg border border-gray-200 w-80 max-h-96 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <Bell className="w-4 h-4 mr-2 text-indigo-600" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button 
            onClick={onMarkAllAsRead}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Tout marquer lu
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Aucune notification.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <li 
                key={notif.id} 
                className={`p-4 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-indigo-50/30' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    {notif.link ? (
                      <Link href={notif.link} className="text-sm font-medium text-gray-900 hover:text-indigo-600 truncate block">
                        {notif.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 truncate">{notif.title}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(notif.createdAt)}
                    </div>
                  </div>
                  {!notif.read && (
                    <button 
                      onClick={() => onMarkAsRead(notif.id)}
                      className="text-gray-400 hover:text-green-600"
                      title="Marquer comme lu"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="p-2 border-t border-gray-200 bg-gray-50 text-center">
        <Link href="/notifications" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
          Voir toutes les notifications
        </Link>
      </div>
    </div>
  );
}
