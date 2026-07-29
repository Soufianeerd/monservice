import ProtectedLayout from '@/components/auth/ProtectedLayout';
import Header from '@/components/layout/Header';
import OnboardingGuide from '@/components/onboarding/OnboardingGuide';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const profileType = user.user_metadata?.profileType;
  if (profileType !== 'client') redirect('/dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProtectedLayout>
          {children}
          <OnboardingGuide />
        </ProtectedLayout>
      </main>
    </div>
  );
}
