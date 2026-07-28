'use client';

import ProtectedLayout from '@/components/auth/ProtectedLayout';
import Header from '@/components/layout/Header';
import OnboardingGuide from '@/components/onboarding/OnboardingGuide';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onMenuClick={() => {}} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProtectedLayout>
          {children}
          <OnboardingGuide />
        </ProtectedLayout>
      </main>
    </div>
  );
}
