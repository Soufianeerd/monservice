'use client';

import { useAuth } from '@/components/auth/AuthContext';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Bell, Menu } from 'lucide-react';
import GlobalSearchBar from '@/components/crm/GlobalSearchBar';
import NotificationCenter from '@/components/crm/NotificationCenter';
import { notificationRepository } from '@/lib/data';
import { Notification } from '@/lib/data/interfaces';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps = {}) {
  const { user, organization, logout } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mounted, setMounted] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      notificationRepository.findByUser(user.id).then(setNotifications);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await notificationRepository.markAsRead(id);
    if (user) notificationRepository.findByUser(user.id).then(setNotifications);
  };

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (user) {
      await notificationRepository.markAllAsRead(user.id);
      notificationRepository.findByUser(user.id).then(setNotifications);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        
        <div className="flex items-center w-1/3">
          <button 
            type="button"
            className="md:hidden p-2 -ml-2 mr-2 text-gray-400 hover:text-gray-600 focus:outline-none"
            onClick={onMenuClick}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          {mounted ? (
            <>
              <span className="text-gray-700 font-semibold text-lg hidden md:block">
                {organization?.name || 'Mon Organisation'}
              </span>
              <span className="mx-3 text-gray-300 hidden md:block">|</span>
              <span className="text-sm text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded hidden md:block">
                {organization?.industry || 'CRM'}
              </span>
            </>
          ) : (
            <div className="hidden md:flex items-center space-x-3">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
              <span className="text-gray-300">|</span>
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          )}
        </div>

        <div className="flex-1 flex justify-center w-1/3 px-4">
          <GlobalSearchBar />
        </div>
        
        <div className="flex items-center justify-end w-1/3 space-x-4">
          
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && mounted && (
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>
            
            {showNotifications && mounted && (
              <div className="absolute right-0 mt-2 z-50">
                <NotificationCenter 
                  notifications={notifications}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAllAsRead={handleMarkAllAsRead}
                />
              </div>
            )}
          </div>

          {mounted ? (
            <>
              <Link href="/profile" className="flex items-center hover:bg-gray-50 p-2 rounded-md transition-colors">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold mr-2">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-sm font-medium text-gray-700">
                  {user?.name || 'Utilisateur'}
                </div>
              </Link>
              <button
                onClick={logout}
                className="text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-md transition-colors"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-4">
              <div className="flex items-center p-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse mr-2"></div>
                <div className="hidden sm:block h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
