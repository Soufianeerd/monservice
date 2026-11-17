import DashboardShell from '@/components/layout/DashboardShell';
import OnboardingGuide from '@/components/onboarding/OnboardingGuide';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { getSessionContext } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { currentTeamRemoval } from '@/lib/services/team.service';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Source d'identité unique : le socle `lib/auth/session`. Ne jamais
  // introduire de second système d'authentification en parallèle : c'est la
  // coexistence anciens systèmes Auth qui provoquait une boucle de redirection
  // et rendait l'application inutilisable (anomalie MS-008).
  const ctx = await getSessionContext();

  if (!ctx) {
    // Membre retiré de son équipe : session valide mais plus aucun accès. On
    // l'informe plutôt que de le renvoyer en boucle vers la connexion.
    const removal = await currentTeamRemoval().catch(() => null);
    redirect(removal ? '/complete-profile' : '/login');
  }
  if (ctx.profileType !== 'professional') redirect('/client/dashboard');
  // Professionnel sans organisation (inscrit sur invitation, ou espace à créer).
  if (!ctx.organizationId) redirect('/complete-profile');

  return (
    <OnboardingProvider>
      <DashboardShell>
        {children}
        <OnboardingGuide />
      </DashboardShell>
    </OnboardingProvider>
  );
}
