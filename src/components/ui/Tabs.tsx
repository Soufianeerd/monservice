'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface TabItem {
  name: string;
  href: string;
}

interface TabsProps {
  tabs: TabItem[];
}

export function Tabs({ tabs }: TabsProps) {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex flex-wrap gap-x-6 gap-y-1" aria-label="Rubriques">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${isActive
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
