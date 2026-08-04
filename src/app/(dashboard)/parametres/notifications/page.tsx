'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import * as notificationActions from '@/app/actions/notification.actions';
import { Notification } from '@/lib/data/interfaces';
import { Check, Clock, AlertCircle } from 'lucide-react';

export default function NotificationsPage() {
  const { user, organization } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = /* notification removed */
      setNotifications([]);
    } catch (error) {
      console.error('Erreur chargement notifications', error);
    }
  };

  useEffect(() => {
    const initNotifications = async () => {
      if (!user) return;
      try {
        const data = /* notification removed */
        setNotifications([]);
      } catch (error) {
        console.error('Erreur chargement notifications', error);
      } finally {
        setLoading(false);
      }
    };

    initNotifications();
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    await notificationActions.markAsReadAction(id);
    fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    if (!user || !organization) return;
    await notificationActions.markAllAsReadAction(organization.id, user.id);
    fetchNotifications();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getPriorityClasses = (priority: string) => {
    if (priority === 'high') return 'text-red-600 border-red-500';
    if (priority === 'medium') return 'text-yellow-600 border-yellow-500';
    return 'text-gray-900 border-gray-200';
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <p className="text-sm text-gray-500">
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
                className={`p-6 hover:bg-gray-50 transition-colors border-l-4 ${!notif.isRead ? 'bg-indigo-50/20' : ''} ${getPriorityClasses(notif.priority)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-4">
                    {notif.link ? (
                      <Link href={notif.link} onClick={() => !notif.isRead && handleMarkAsRead(notif.id)} className="text-base font-medium text-indigo-600 hover:text-indigo-800 flex items-center">
                        {notif.priority === 'high' && <AlertCircle className="w-4 h-4 text-red-500 mr-2" />}
                        {notif.title}
                      </Link>
                    ) : (
                      <p className="text-base font-medium text-gray-900 flex items-center">
                        {notif.priority === 'high' && <AlertCircle className="w-4 h-4 text-red-500 mr-2" />}
                        {notif.title}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(notif.createdAt)}
                    </div>
                  </div>
                  {!notif.isRead && (
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
