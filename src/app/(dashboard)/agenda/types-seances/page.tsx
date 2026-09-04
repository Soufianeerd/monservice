import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { schedulingService } from '@/lib/services/scheduling.service';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { AppointmentTypeManager } from '@/components/scheduling/AppointmentTypeManager';
import { notFound } from 'next/navigation';

export default async function TypesSeancesPage() {
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

  const types = await schedulingService.listAppointmentTypes(organization.id);

  return (
    <div className="space-y-6">
      <AppointmentTypeManager initialTypes={types} />
    </div>
  );
}
