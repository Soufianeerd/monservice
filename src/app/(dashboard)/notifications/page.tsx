'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { notificationRepository } from '@/lib/data';
import { Notification } from '@/lib/data/interfaces';
import { Check, Clock } from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await notificationRepository.findByUser(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Erreur chargement notifications', error);
    }
  };

  useEffect(() => {
    const initNotifications = async () => {
      if (!user) return;
      try {
        const data = await notificationRepository.findByUser(user.id);
        setNotifications(data);
      } catch (error) {
        console.error('Erreur chargement notifications', error);
      } finally {
        setLoading(false);
      }
    };

    initNotifications();
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    await notificationRepository.markAsRead(id);
    fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await notificationRepository.markAllAsRead(user.id);
    fetchNotifications();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Centre de Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Vous avez {unreadCount} notification{unreadCount !== 1 ? 's' : ''} non lue{unreadCount !== 1 ? 's' : ''}.
          </p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucune notification.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <li 
                key={notif.id} 
                className={`p-6 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-indigo-50/20' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-4">
                    {notif.link ? (
                      <Link href={notif.link} className="text-base font-medium text-indigo-600 hover:text-indigo-800">
                        {notif.title}
                      </Link>
                    ) : (
                      <p className="text-base font-medium text-gray-900">{notif.title}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(notif.createdAt)}
                    </div>
                  </div>
                  {!notif.read && (
                    <button 
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Check className="w-3 h-3 mr-1" /> Lu
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
