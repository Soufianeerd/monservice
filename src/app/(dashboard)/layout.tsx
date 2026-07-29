import DashboardShell from '@/components/layout/DashboardShell';
import OnboardingGuide from '@/components/onboarding/OnboardingGuide';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const profileType = user.user_metadata?.profileType;
  if (profileType !== 'professional' && profileType !== 'admin') redirect('/client/dashboard');

  return (
    <DashboardShell>
      {children}
      <OnboardingGuide />
    </DashboardShell>
  );
}
