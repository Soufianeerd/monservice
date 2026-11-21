import { getOrganizationForRequest } from '@/lib/services/organization-request';
import { requireProfessional } from '@/lib/auth/session';
import { resolveWorkspace } from '@/lib/workspaces';
import { patientRegistryService } from '@/lib/services/patient-registry.service';
import { findActiveClinicalPractitioner } from '@/lib/clinical/auth';
import { notFound } from 'next/navigation';
import PatientDetailManager from '@/components/patients/PatientDetailManager';

interface PatientDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function PatientDetailPage(props: PatientDetailPageProps) {
  const resolvedParams = await props.params;
  const patientId = resolvedParams.id;

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

  const detail = await patientRegistryService.getPatientDetail(organization.id, patientId);
  if (!detail) {
    notFound();
  }

  const allRepresentatives = await patientRegistryService.listRepresentatives(organization.id);

  let canAccessClinical = false;
  if (workspace.capabilities.includes('clinicalRecords') && workspace.capabilities.includes('careEpisodes')) {
    const practitionerId = await findActiveClinicalPractitioner(organization.id, context.userId);
    canAccessClinical = Boolean(practitionerId);
  }

  return (
    <PatientDetailManager
      initialDetail={detail}
      allRepresentatives={allRepresentatives}
      canAccessClinical={canAccessClinical}
    />
  );
}
