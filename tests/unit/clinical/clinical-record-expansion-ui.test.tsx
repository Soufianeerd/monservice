// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClinicalRecordManager from '@/components/clinical/ClinicalRecordManager';
import type { PatientProfileDTO } from '@/lib/patients/types';
import type {
  CareEpisodeDTO,
  ClinicalEncounterWithNotesDTO,
  ClinicalDocumentDTO,
  ClinicalFormTemplateDTO,
  ClinicalFormResponseDTO,
  ClinicalMeasurementDTO,
  ClinicalTimelineItem,
} from '@/lib/clinical/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/app/actions/clinical-record.actions', () => ({
  createCareEpisodeAction: vi.fn(),
  closeCareEpisodeAction: vi.fn(),
  createClinicalEncounterAction: vi.fn(),
  createClinicalNoteAction: vi.fn(),
  updateDraftClinicalNoteAction: vi.fn(),
  finalizeClinicalNoteAction: vi.fn(),
  getEligibleAppointmentsAction: vi.fn(),
  uploadClinicalDocumentAction: vi.fn(),
  archiveClinicalDocumentAction: vi.fn(),
  getClinicalDocumentDownloadUrlAction: vi.fn(),
  createClinicalFormTemplateAction: vi.fn(),
  createClinicalFormResponseAction: vi.fn(),
  updateDraftClinicalFormResponseAction: vi.fn(),
  finalizeClinicalFormResponseAction: vi.fn(),
  createClinicalMeasurementAction: vi.fn(),
}));

describe('ClinicalRecordManager Tab Navigation & Expansion Sections', () => {
  const mockPatient: PatientProfileDTO = {
    id: 'patient-1',
    birthName: 'DUPONT',
    firstBirthName: 'Alice',
    birthFirstNames: 'Alice Marie',
    usedName: null,
    usedFirstName: null,
    birthDate: '1990-05-15',
    sex: 'female',
    birthPlace: 'Paris',
    birthPlaceCode: '75056',
    birthCountry: 'France',
    email: 'alice@dupont.fr',
    phone: '0601020304',
    address: '10 rue de Paris',
    city: 'Paris',
    postalCode: '75001',
    country: 'France',
    isActive: true,
  };

  const mockEpisodes: CareEpisodeDTO[] = [
    {
      id: 'episode-1',
      organizationId: 'org-1',
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      title: 'Rééducation cheville',
      status: 'active',
      startedAt: '2026-08-01T08:00:00.000Z',
      closedAt: null,
      createdAt: '2026-08-01T08:00:00.000Z',
      updatedAt: '2026-08-01T08:00:00.000Z',
    },
  ];

  const mockEncountersByEpisode: Record<string, ClinicalEncounterWithNotesDTO[]> = {
    'episode-1': [],
  };

  const mockOverview = {
    activeEpisodesCount: 1,
    totalEpisodesCount: 1,
    lastEncounter: null,
    lastFinalizedNote: null,
    recentDocuments: [],
    recentMeasurements: [],
    draftFormResponsesCount: 0,
    totalDocumentsCount: 0,
  };

  const mockTimeline: ClinicalTimelineItem[] = [];

  const mockDocuments: ClinicalDocumentDTO[] = [
    {
      id: 'doc-1',
      organizationId: 'org-1',
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      careEpisodeId: 'episode-1',
      encounterId: null,
      title: 'Ordonnance médecin traitant',
      category: 'prescription',
      fileName: 'ordonnance.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 51200,
      storagePath: 'path/to/doc',
      isArchived: false,
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    },
  ];

  const mockTemplates: ClinicalFormTemplateDTO[] = [
    {
      id: 'tpl-1',
      organizationId: 'org-1',
      practitionerId: 'practitioner-1',
      name: 'Bilan articulaire',
      kind: 'assessment',
      description: 'Évaluation amplitudes',
      schemaJson: {
        fields: [
          { id: 'amplitude', label: 'Amplitude (°)', type: 'number', required: true },
        ],
      },
      isActive: true,
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    },
  ];

  const mockResponses: ClinicalFormResponseDTO[] = [];

  const mockMeasurements: ClinicalMeasurementDTO[] = [
    {
      id: 'm-1',
      organizationId: 'org-1',
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      careEpisodeId: null,
      encounterId: null,
      code: 'pain_score',
      label: 'Échelle EVA',
      valueNumeric: 5,
      valueText: null,
      unit: '/10',
      observedAt: '2026-09-10T12:00:00.000Z',
      createdAt: '2026-09-10T12:00:00.000Z',
    },
  ];

  it('renders all 6 top tabs and defaults to Overview', () => {
    render(
      <ClinicalRecordManager
        patient={mockPatient}
        initialEpisodes={mockEpisodes}
        initialEncountersByEpisode={mockEncountersByEpisode}
        initialEligibleAppointments={[]}
        initialOverview={mockOverview}
        initialTimeline={mockTimeline}
        initialDocuments={mockDocuments}
        initialFormTemplates={mockTemplates}
        initialFormResponses={mockResponses}
        initialMeasurements={mockMeasurements}
      />,
    );

    expect(screen.getByText('Vue d’ensemble')).toBeInTheDocument();
    expect(screen.getByText('Épisodes & Séances')).toBeInTheDocument();
    expect(screen.getByText('Timeline clinique')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Bilans & Formulaires')).toBeInTheDocument();
    expect(screen.getByText('Mesures & Constantes')).toBeInTheDocument();

    // Default Overview contains stats
    expect(screen.getByText('Épisodes actifs')).toBeInTheDocument();
  });

  it('switches to Documents tab and shows document cards', () => {
    render(
      <ClinicalRecordManager
        patient={mockPatient}
        initialEpisodes={mockEpisodes}
        initialEncountersByEpisode={mockEncountersByEpisode}
        initialEligibleAppointments={[]}
        initialOverview={mockOverview}
        initialTimeline={mockTimeline}
        initialDocuments={mockDocuments}
        initialFormTemplates={mockTemplates}
        initialFormResponses={mockResponses}
        initialMeasurements={mockMeasurements}
      />,
    );

    fireEvent.click(screen.getByText('Documents'));
    expect(screen.getByText('Ordonnance médecin traitant')).toBeInTheDocument();
    expect(screen.getByText('ordonnance.pdf')).toBeInTheDocument();
  });

  it('switches to Mesures tab and shows measurements table', () => {
    render(
      <ClinicalRecordManager
        patient={mockPatient}
        initialEpisodes={mockEpisodes}
        initialEncountersByEpisode={mockEncountersByEpisode}
        initialEligibleAppointments={[]}
        initialOverview={mockOverview}
        initialTimeline={mockTimeline}
        initialDocuments={mockDocuments}
        initialFormTemplates={mockTemplates}
        initialFormResponses={mockResponses}
        initialMeasurements={mockMeasurements}
      />,
    );

    fireEvent.click(screen.getByText('Mesures & Constantes'));
    expect(screen.getByText('Échelle EVA')).toBeInTheDocument();
    expect(screen.getAllByText('pain_score').length).toBeGreaterThanOrEqual(1);
  });
});
