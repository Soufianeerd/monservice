import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { resolveWorkspace } from '@/lib/workspaces';
import { patientRegistryService } from '@/lib/services/patient-registry.service';
import { notFound } from 'next/navigation';
import PatientList from '@/components/patients/PatientList';

export default async function PatientsPage() {
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

  const initialPatients = await patientRegistryService.listPatients(organization.id, {
    active: 'active',
    limit: 25,
    offset: 0,
  });

  return <PatientList initialData={initialPatients} />;
}
