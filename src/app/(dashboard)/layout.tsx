import DashboardShell from '@/components/layout/DashboardShell';
import OnboardingGuide from '@/components/onboarding/OnboardingGuide';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      {children}
      <OnboardingGuide />
    </DashboardShell>
  );
}
