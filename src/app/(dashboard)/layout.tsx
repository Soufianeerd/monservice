import DashboardShell from '@/components/layout/DashboardShell';
import OnboardingGuide from '@/components/onboarding/OnboardingGuide';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { getSessionContext } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Source d'identité unique : le socle `lib/auth/session`. Ne jamais
  // introduire de second système d'authentification en parallèle : c'est la
  // coexistence NextAuth / Supabase qui provoquait une boucle de redirection
  // et rendait l'application inutilisable (anomalie MS-008).
  const ctx = await getSessionContext();

  if (!ctx) redirect('/login');
  if (ctx.profileType !== 'professional') redirect('/client/dashboard');

  return (
    <OnboardingProvider>
      <DashboardShell>
        {children}
        <OnboardingGuide />
      </DashboardShell>
    </OnboardingProvider>
  );
}
