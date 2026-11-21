import { getOrganizationForRequest } from '@/lib/services/organization-request';
import { prepareStarterPractice } from '@/lib/services/practice-starter.service';
import { requireProfessional } from '@/lib/auth/session';
import { schedulingService } from '@/lib/services/scheduling.service';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { AppointmentTypeManager } from '@/components/scheduling/AppointmentTypeManager';
import { notFound } from 'next/navigation';

export default async function TypesSeancesPage() {
  const context = await requireProfessional();
  if (!context.organizationId) {
    notFound();
  }

  const organization = await getOrganizationForRequest(context.organizationId);
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

  await prepareStarterPractice(organization.id, context.userId);
  const types = await schedulingService.listAppointmentTypes(organization.id);

  return (
    <div className="space-y-6">
      <AppointmentTypeManager
        initialTypes={types}
        professionPack={workspace.professionPack}
      />
    </div>
  );
}
