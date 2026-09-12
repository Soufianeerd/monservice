import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { patientRegistryService } from '@/lib/services/patient-registry.service';
import { clinicalRecordService } from '@/lib/services/clinical-record.service';
import { notFound } from 'next/navigation';
import ClinicalRecordManager from '@/components/clinical/ClinicalRecordManager';
import type { ClinicalEncounterWithNotesDTO } from '@/lib/clinical/types';

interface PatientClinicalPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function PatientClinicalPage(props: PatientClinicalPageProps) {
  const resolvedParams = await props.params;
  const patientId = resolvedParams.id;

  let context;
  try {
    context = await requireClinicalPractitionerContext();
  } catch {
    notFound();
  }

  const { organizationId, practitionerId } = context;

  const detail = await patientRegistryService.getPatientDetail(organizationId, patientId);
  if (!detail) {
    notFound();
  }

  const [
    episodes,
    eligibleAppointments,
    overview,
    timeline,
    documents,
    formTemplates,
    formResponses,
    measurements,
  ] = await Promise.all([
    clinicalRecordService.listCareEpisodes(organizationId, patientId, practitionerId),
    clinicalRecordService.listEligibleAppointmentsForEncounter(
      organizationId,
      patientId,
      practitionerId,
    ),
    clinicalRecordService.getPatientClinicalOverview(organizationId, patientId, practitionerId),
    clinicalRecordService.getPatientClinicalTimeline(organizationId, patientId, practitionerId),
    clinicalRecordService.listClinicalDocuments(organizationId, patientId, practitionerId),
    clinicalRecordService.listFormTemplates(organizationId, practitionerId, true),
    clinicalRecordService.listFormResponses(organizationId, patientId, practitionerId),
    clinicalRecordService.listMeasurements(organizationId, patientId, practitionerId),
  ]);

  const encountersByEpisode: Record<string, ClinicalEncounterWithNotesDTO[]> = {};
  for (const episode of episodes) {
    encountersByEpisode[episode.id] = await clinicalRecordService.listClinicalEncounters(
      organizationId,
      patientId,
      practitionerId,
      episode.id,
    );
  }

  return (
    <ClinicalRecordManager
      patient={detail.patient}
      initialEpisodes={episodes}
      initialEncountersByEpisode={encountersByEpisode}
      initialEligibleAppointments={eligibleAppointments}
      initialOverview={overview}
      initialTimeline={timeline}
      initialDocuments={documents}
      initialFormTemplates={formTemplates}
      initialFormResponses={formResponses}
      initialMeasurements={measurements}
    />
  );
}
