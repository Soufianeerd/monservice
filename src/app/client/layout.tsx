import ProtectedLayout from '@/components/auth/ProtectedLayout';
import Header from '@/components/layout/Header';
import OnboardingGuide from '@/components/onboarding/OnboardingGuide';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { getSessionContext } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  // Source d'identité unique : le socle `lib/auth/session` (anomalie MS-008).
  const ctx = await getSessionContext();

  if (!ctx) redirect('/login');
  if (ctx.profileType !== 'client') redirect('/dashboard');

  return (
    <OnboardingProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProtectedLayout>
            {children}
            <OnboardingGuide />
          </ProtectedLayout>
        </main>
      </div>
    </OnboardingProvider>
  );
}
