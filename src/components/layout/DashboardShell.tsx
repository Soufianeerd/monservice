'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ProtectedLayout from '../auth/ProtectedLayout';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <ProtectedLayout>
            {children}
          </ProtectedLayout>
        </main>
      </div>
    </div>
  );
}
