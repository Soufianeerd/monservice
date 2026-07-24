'use client';

import React from 'react';
import Link from 'next/link';
import { Notification } from '@/lib/data/interfaces';
import { Bell, Check, Clock, AlertCircle } from 'lucide-react';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationCenter({ notifications, onMarkAsRead, onMarkAllAsRead }: NotificationCenterProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

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

  const getPriorityClasses = (priority: string) => {
    if (priority === 'high') return 'text-red-600 bg-red-50 border-red-100';
    if (priority === 'medium') return 'text-yellow-600 bg-yellow-50 border-yellow-100';
    return 'text-gray-500 bg-white border-transparent';
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
                className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${!notif.isRead ? 'bg-indigo-50/30' : ''} ${getPriorityClasses(notif.priority)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    {notif.link ? (
                      <Link href={notif.link} onClick={() => !notif.isRead && onMarkAsRead(notif.id)} className="text-sm font-medium text-gray-900 hover:text-indigo-600 block mb-1">
                        <span className="flex items-center">
                          {notif.priority === 'high' && <AlertCircle className="w-3 h-3 text-red-500 mr-1" />}
                          {notif.title}
                        </span>
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 flex items-center mb-1">
                        {notif.priority === 'high' && <AlertCircle className="w-3 h-3 text-red-500 mr-1" />}
                        {notif.title}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 line-clamp-2 leading-tight">{notif.message}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(notif.createdAt)}
                    </div>
                  </div>
                  {!notif.isRead && (
                    <button 
                      onClick={() => onMarkAsRead(notif.id)}
                      className="text-gray-400 hover:text-green-600 ml-2"
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
