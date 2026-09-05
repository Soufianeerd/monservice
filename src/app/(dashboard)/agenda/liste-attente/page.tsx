import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { schedulingService } from '@/lib/services/scheduling.service';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { notFound, redirect } from 'next/navigation';
import { WaitlistManager } from '@/components/scheduling/WaitlistManager';

export default async function WaitlistPage() {
  const context = await requireProfessional();
  if (!context.organizationId) {
    notFound();
  }

  const organization = await organizationService.getById(context.organizationId);
  if (!organization) {
    notFound();
  }

  const workspace = resolveWorkspace({
    sector: organization.sector,
    profession: organization.profession,
    country: organization.country,
  });

  // Waitlist is strictly for paramedical workspace
  if (workspace.type !== 'paramedical') {
    redirect('/agenda/calendrier');
  }

  const bootstrap = await schedulingService.getSchedulingBootstrap(organization.id);

  return (
    <div className="space-y-6">
      <WaitlistManager bootstrap={bootstrap} />
    </div>
  );
}
