'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ChevronDown, ChevronRight, LayoutDashboard, Users, TrendingUp, FileText, Calendar, Store, MessageSquare, Settings } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useWorkspace } from '@/hooks/useWorkspace';
import { buildProfessionalNavigation, NavigationIconKey } from '@/lib/navigation/workspace-navigation';

const iconMap: Record<NavigationIconKey, React.ElementType> = {
  dashboard: LayoutDashboard,
  users: Users,
  deals: TrendingUp,
  billing: FileText,
  agenda: Calendar,
  marketplace: Store,
  messages: MessageSquare,
  settings: Settings,
};

type SubItem = { name: string; href: string };

type NavItem = {
  id?: string;
  name: string;
  href: string;
  icon: React.ElementType;
  subItems?: readonly SubItem[];
  dataTour?: string;
};

const clientNavItems: NavItem[] = [
  { id: 'dashboard', name: 'Tableau de bord', href: '/client/dashboard', icon: LayoutDashboard },
  { id: 'requests', name: 'Mes demandes', href: '/client/requests', icon: FileText },
  { id: 'quotes', name: 'Devis reçus', href: '/client/quotes', icon: FileText },
  { id: 'invoices', name: 'Mes factures', href: '/client/invoices', icon: FileText },
  { id: 'messages', name: 'Messagerie', href: '/client/messages', icon: MessageSquare },
  { id: 'profile', name: 'Profil', href: '/client/profile', icon: Users },
];

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen = false, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const role = useRole();
  const workspace = useWorkspace();
  
  const navItems: NavItem[] = role === 'client' 
    ? clientNavItems 
    : (workspace ? buildProfessionalNavigation(workspace).map(item => ({
        ...item,
        icon: iconMap[item.icon]
      })) : []);
      
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
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
              const itemKey = item.id || item.name;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const isExpanded = expandedItems[itemKey] || isActive;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const Icon = item.icon;

              return (
                <div key={itemKey}>
                  <Link
                    href={hasSubItems ? '#' : item.href}
                    onClick={(e) => {
                      if (hasSubItems) {
                        e.preventDefault();
                        toggleExpand(itemKey);
                      } else {
                        setIsOpen?.(false);
                      }
                    }}
                    data-tour={item.dataTour}
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
