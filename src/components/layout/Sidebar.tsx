'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useRole } from '@/hooks/useRole';

const professionalNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Marketplace', href: '/marketplace', icon: '🌍' },
  { name: 'Mes devis', href: '/quotes', icon: '📝' },
  { name: 'Messagerie', href: '/messages', icon: '💬' },
  { name: 'Calendrier', href: '/calendar', icon: '📅' },
  { name: 'Rapports', href: '/reports', icon: '📈' },
  { name: 'Activité', href: '/activity', icon: '⚡' },
  { name: 'Clients', href: '/clients', icon: '🏢' },
  { name: 'Contacts', href: '/contacts', icon: '👤' },
  { name: 'Deals', href: '/deals', icon: '💼' },
  { name: 'Produits', href: '/products', icon: '📦' },
  { name: 'Factures', href: '/invoices', icon: '📄' },
  { name: 'Tâches', href: '/tasks', icon: '✅' },
  { name: 'Modèles', href: '/templates', icon: '✉️' },
  { name: 'Profil', href: '/profile', icon: '👤' },
  { name: 'Paramètres Org.', href: '/settings/organization', icon: '⚙️' },
];

const clientNavItems = [
  { name: 'Tableau de bord', href: '/client/dashboard', icon: '📊' },
  { name: 'Mes demandes', href: '/client/requests', icon: '📝' },
  { name: 'Devis reçus', href: '/client/quotes', icon: '📄' },
  { name: 'Mes factures', href: '/client/invoices', icon: '💳' },
  { name: 'Messagerie', href: '/client/messages', icon: '💬' },
  { name: 'Profil', href: '/client/profile', icon: '👤' },
];

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen = false, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const role = useRole();
  const navItems = role === 'client' ? clientNavItems : professionalNavItems;

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 md:hidden"
          onClick={() => setIsOpen?.(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Content */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 bg-gray-950 px-4">
          <Link href={role === 'client' ? '/client/dashboard' : '/dashboard'} className="font-bold text-xl tracking-wider">
            MonService
          </Link>
          <button
            type="button"
            className="md:hidden p-2 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
            onClick={() => setIsOpen?.(false)}
            aria-label="Fermer le menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <nav className="px-2 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen?.(false)}
                  className={`${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                >
                  <span className="mr-3 text-lg" aria-hidden="true">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
