'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ProtectedLayout from '../auth/ProtectedLayout';
import { ClientAccessProvider } from './ClientAccessContext';
import { CareVocabularyProvider } from '@/hooks/useCareVocabulary';

export default function DashboardShell({ children, clientAccess = true }: { children: React.ReactNode; clientAccess?: boolean }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ClientAccessProvider value={clientAccess}>
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} clientAccess={clientAccess} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto pb-24">
          <ProtectedLayout>
            <CareVocabularyProvider>{children}</CareVocabularyProvider>
          </ProtectedLayout>
        </main>
      </div>
    </div>
    </ClientAccessProvider>
  );
}
