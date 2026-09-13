// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClinicalRecordManager from '@/components/clinical/ClinicalRecordManager';
import { AppointmentTypeManager } from '@/components/scheduling/AppointmentTypeManager';
import { PHYSIOTHERAPIST_PACK } from '@/lib/workspaces/paramedical/profession-packs/physiotherapist';
import { DIETITIAN_PACK } from '@/lib/workspaces/paramedical/profession-packs/dietitian';
import type { PatientProfileDTO } from '@/lib/patients/types';
import type { CareEpisodeDTO } from '@/lib/clinical/types';

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
  createClinicalFormTemplateFromPresetAction: vi.fn(),
  createClinicalFormResponseAction: vi.fn(),
  updateDraftClinicalFormResponseAction: vi.fn(),
  finalizeClinicalFormResponseAction: vi.fn(),
  createClinicalMeasurementAction: vi.fn(),
}));

vi.mock('@/app/actions/scheduling.actions', () => ({
  createAppointmentTypeAction: vi.fn(),
  updateAppointmentTypeAction: vi.fn(),
  setAppointmentTypeActiveAction: vi.fn(),
  installParamedicalAppointmentTypePresetAction: vi.fn(),
}));

describe('Profession-Aware Clinical & Scheduling UI', () => {
  const mockPatient: PatientProfileDTO = {
    id: 'patient-1',
    birthName: 'MARTIN',
    firstBirthName: 'Paul',
    birthFirstNames: 'Paul Jean',
    usedName: null,
    usedFirstName: null,
    birthDate: '1985-03-20',
    sex: 'male',
    birthPlace: 'Lyon',
    birthPlaceCode: '69001',
    birthCountry: 'France',
    email: 'paul@martin.fr',
    phone: '0612345678',
    address: '5 rue de la République',
    city: 'Lyon',
    postalCode: '69001',
    country: 'France',
    isActive: true,
  };

  const mockEpisodes: CareEpisodeDTO[] = [
    {
      id: 'ep-1',
      organizationId: 'org-1',
      patientId: 'patient-1',
      practitionerId: 'prac-1',
      title: 'Prise en charge',
      status: 'active',
      startedAt: '2026-09-01T08:00:00.000Z',
      closedAt: null,
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
  ];

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

  it('renders physiotherapist header title and displays recommended kiné form presets', () => {
    render(
      <ClinicalRecordManager
        patient={mockPatient}
        professionPack={PHYSIOTHERAPIST_PACK}
        initialEpisodes={mockEpisodes}
        initialEncountersByEpisode={{ 'ep-1': [] }}
        initialEligibleAppointments={[]}
        initialOverview={mockOverview}
        initialTimeline={[]}
        initialDocuments={[]}
        initialFormTemplates={[]}
        initialFormResponses={[]}
        initialMeasurements={[]}
      />,
    );

    expect(screen.getByText('Dossier de suivi kinésithérapique')).toBeInTheDocument();

    // Switch to Forms tab
    fireEvent.click(screen.getByText('Bilans & Formulaires'));
    // Switch to Modèles sub-tab
    fireEvent.click(screen.getByText(/Modèles de bilans/i));

    expect(
      screen.getByText(/Modèles recommandés pour votre activité \(Masseur-Kinésithérapeute\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Bilan initial kinésithérapique')).toBeInTheDocument();
    expect(screen.getByText('Suivi de séance kinésithérapique')).toBeInTheDocument();
    expect(screen.queryByText('Bilan nutritionnel initial')).not.toBeInTheDocument();
  });

  it('renders dietitian header title and displays dietitian form presets', () => {
    render(
      <ClinicalRecordManager
        patient={mockPatient}
        professionPack={DIETITIAN_PACK}
        initialEpisodes={mockEpisodes}
        initialEncountersByEpisode={{ 'ep-1': [] }}
        initialEligibleAppointments={[]}
        initialOverview={mockOverview}
        initialTimeline={[]}
        initialDocuments={[]}
        initialFormTemplates={[]}
        initialFormResponses={[]}
        initialMeasurements={[]}
      />,
    );

    expect(screen.getByText('Dossier de suivi nutritionnel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Bilans & Formulaires'));
    fireEvent.click(screen.getByText(/Modèles de bilans/i));

    expect(
      screen.getByText(/Modèles recommandés pour votre activité \(Diététicien\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Bilan nutritionnel initial')).toBeInTheDocument();
    expect(screen.getByText('Suivi nutritionnel')).toBeInTheDocument();
    expect(screen.queryByText('Bilan initial kinésithérapique')).not.toBeInTheDocument();
  });

  it('renders quick measurement presets from profession pack and pre-fills form on click without creating record', () => {
    render(
      <ClinicalRecordManager
        patient={mockPatient}
        professionPack={DIETITIAN_PACK}
        initialEpisodes={mockEpisodes}
        initialEncountersByEpisode={{ 'ep-1': [] }}
        initialEligibleAppointments={[]}
        initialOverview={mockOverview}
        initialTimeline={[]}
        initialDocuments={[]}
        initialFormTemplates={[]}
        initialFormResponses={[]}
        initialMeasurements={[]}
      />,
    );

    // Switch to Measurements tab
    fireEvent.click(screen.getByText('Mesures & Constantes'));
    // Open new measurement modal
    fireEvent.click(screen.getByText('Relever une mesure'));

    expect(screen.getByText('Poids corporel')).toBeInTheDocument();
    expect(screen.getByText('Indice de masse corporelle (IMC)')).toBeInTheDocument();
    expect(screen.getByText('Tour de taille')).toBeInTheDocument();

    // Click on "Tour de taille" preset
    fireEvent.click(screen.getByText('Tour de taille'));

    const codeInput = screen.getByPlaceholderText('ex: pain_score') as HTMLInputElement;
    const labelInput = screen.getByPlaceholderText('ex: Échelle de douleur EVA') as HTMLInputElement;

    expect(codeInput.value).toBe('waist_circumference');
    expect(labelInput.value).toBe('Tour de taille');
  });

  it('renders generic fallback clinical header when profession pack is undefined', () => {
    render(
      <ClinicalRecordManager
        patient={mockPatient}
        professionPack={undefined}
        initialEpisodes={mockEpisodes}
        initialEncountersByEpisode={{ 'ep-1': [] }}
        initialEligibleAppointments={[]}
        initialOverview={mockOverview}
        initialTimeline={[]}
        initialDocuments={[]}
        initialFormTemplates={[]}
        initialFormResponses={[]}
        initialMeasurements={[]}
      />,
    );

    expect(screen.getByText('Dossier de suivi clinique paramédical')).toBeInTheDocument();
  });

  it('renders appointment type suggestions in AppointmentTypeManager when professionPack is provided', () => {
    render(
      <AppointmentTypeManager
        initialTypes={[]}
        professionPack={PHYSIOTHERAPIST_PACK}
      />,
    );

    expect(
      screen.getByText(/Suggestions pour votre activité \(Masseur-Kinésithérapeute\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Bilan initial de kinésithérapie')).toBeInTheDocument();
    expect(screen.getByText('Séance de suivi de kinésithérapie')).toBeInTheDocument();
  });
});
