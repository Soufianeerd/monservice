import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { schedulingService } from '@/lib/services/scheduling.service';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { AvailabilityManager } from '@/components/scheduling/AvailabilityManager';
import { notFound } from 'next/navigation';

export default async function DisponibilitesPage() {
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

  if (workspace.type !== 'paramedical') {
    notFound();
  }

  const bootstrap = await schedulingService.getSchedulingBootstrap(organization.id);
  const [rules, exceptions] = await Promise.all([
    schedulingService.listAvailabilityRules(organization.id),
    schedulingService.listAvailabilityExceptions(organization.id),
  ]);

  return (
    <div className="space-y-6">
      <AvailabilityManager
        practitioners={bootstrap.practitioners}
        locations={bootstrap.locations}
        initialRules={rules}
        initialExceptions={exceptions}
      />
    </div>
  );
}
