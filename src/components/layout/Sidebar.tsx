'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ChevronDown, ChevronRight, LayoutDashboard, Users, TrendingUp, FileText, Calendar, Store, MessageSquare, Settings } from 'lucide-react';
import { useRole } from '@/hooks/useRole';

type SubItem = { name: string; href: string };

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  subItems?: SubItem[];
};

const professionalNavItems: NavItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Deals', href: '/deals', icon: TrendingUp },
  { 
    name: 'Facturation', href: '/facturation', icon: FileText, 
    subItems: [
      { name: 'Factures', href: '/facturation/factures' },
      { name: 'Devis', href: '/facturation/devis' },
      { name: 'Produits', href: '/facturation/produits' },
    ]
  },
  { 
    name: 'Agenda', href: '/agenda', icon: Calendar, 
    subItems: [
      { name: 'Calendrier', href: '/agenda/calendrier' },
      { name: 'Tâches', href: '/agenda/taches' },
    ]
  },
  { name: 'Marketplace', href: '/marketplace', icon: Store },
  { name: 'Messagerie', href: '/messages', icon: MessageSquare },
  { 
    name: 'Paramètres', href: '/parametres', icon: Settings, 
    subItems: [
      { name: 'Profil', href: '/parametres/profil' },
      { name: 'Organisation', href: '/parametres/organisation' },
      { name: 'Facturation', href: '/parametres/facturation' },
      { name: 'Notifications', href: '/parametres/notifications' },
    ]
  },
];

const clientNavItems: NavItem[] = [
  { name: 'Tableau de bord', href: '/client/dashboard', icon: LayoutDashboard },
  { name: 'Mes demandes', href: '/client/requests', icon: FileText },
  { name: 'Devis reçus', href: '/client/quotes', icon: FileText },
  { name: 'Mes factures', href: '/client/invoices', icon: FileText },
  { name: 'Messagerie', href: '/client/messages', icon: MessageSquare },
  { name: 'Profil', href: '/client/profile', icon: Users },
];

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen = false, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const role = useRole();
  const navItems = role === 'client' ? clientNavItems : professionalNavItems;
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (name: string) => {
    setExpandedItems(prev => ({ ...prev, [name]: !prev[name] }));
  };

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
              const isExpanded = expandedItems[item.name] || isActive;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const Icon = item.icon;

              return (
                <div key={item.name}>
                  <Link
                    href={hasSubItems ? '#' : item.href}
                    onClick={(e) => {
                      if (hasSubItems) {
                        e.preventDefault();
                        toggleExpand(item.name);
                      } else {
                        setIsOpen?.(false);
                      }
                    }}
                    className={`${
                      isActive
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    } group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  >
                    <div className="flex items-center">
                      <Icon className="mr-3 flex-shrink-0 h-5 w-5" aria-hidden="true" />
                      {item.name}
                    </div>
                    {hasSubItems && (
                      isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    )}
                  </Link>

                  {hasSubItems && isExpanded && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.subItems!.map((subItem) => {
                        const isSubActive = pathname === subItem.href || pathname.startsWith(`${subItem.href}/`);
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            onClick={() => setIsOpen?.(false)}
                            className={`${
                              isSubActive
                                ? 'text-white font-semibold'
                                : 'text-gray-400 hover:text-gray-200'
                            } group flex items-center px-2 py-1.5 text-sm font-medium rounded-md transition-colors`}
                          >
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
