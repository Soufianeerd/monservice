// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClinicalRecordManager from '@/components/clinical/ClinicalRecordManager';
import type { PatientProfileDTO } from '@/lib/patients/types';
import type {
  CareEpisodeDTO,
  ClinicalEncounterWithNotesDTO,
  EligibleAppointmentDTO,
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
}));

describe('ClinicalRecordManager Component', () => {
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
    {
      id: 'episode-2',
      organizationId: 'org-1',
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      title: 'Suivi post-opératoire ancien',
      status: 'closed',
      startedAt: '2026-05-01T08:00:00.000Z',
      closedAt: '2026-06-01T10:00:00.000Z',
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z',
    },
  ];

  const mockEncountersByEpisode: Record<string, ClinicalEncounterWithNotesDTO[]> = {
    'episode-1': [
      {
        id: 'encounter-1',
        organizationId: 'org-1',
        careEpisodeId: 'episode-1',
        patientId: 'patient-1',
        practitionerId: 'practitioner-1',
        appointmentId: null,
        occurredAt: '2026-08-05T09:00:00.000Z',
        createdAt: '2026-08-05T09:00:00.000Z',
        updatedAt: '2026-08-05T09:00:00.000Z',
        notes: [
          {
            id: 'note-1',
            organizationId: 'org-1',
            encounterId: 'encounter-1',
            patientId: 'patient-1',
            authorPractitionerId: 'practitioner-1',
            content: 'Mobilisation passive sans douleur.',
            status: 'finalized',
            finalizedAt: '2026-08-05T09:30:00.000Z',
            createdAt: '2026-08-05T09:10:00.000Z',
            updatedAt: '2026-08-05T09:30:00.000Z',
          },
          {
            id: 'note-2',
            organizationId: 'org-1',
            encounterId: 'encounter-1',
            patientId: 'patient-1',
            authorPractitionerId: 'practitioner-1',
            content: 'Brouillon en cours de rédaction.',
            status: 'draft',
            finalizedAt: null,
            createdAt: '2026-08-05T09:35:00.000Z',
            updatedAt: '2026-08-05T09:35:00.000Z',
          },
        ],
      },
    ],
    'episode-2': [],
  };

  const mockEligibleAppointments: EligibleAppointmentDTO[] = [
    {
      id: 'appt-1',
      startsAt: '2026-08-05T09:00:00.000Z',
      endsAt: '2026-08-05T09:30:00.000Z',
      status: 'scheduled',
      appointmentTypeId: 'type-1',
      appointmentTypeName: 'Séance de suivi',
    },
  ];

  it('renders patient name and episode list', () => {
    render(
      <ClinicalRecordManager
        patient={mockPatient}
        initialEpisodes={mockEpisodes}
        initialEncountersByEpisode={mockEncountersByEpisode}
        initialEligibleAppointments={mockEligibleAppointments}
      />,
    );

    expect(screen.getByText(/DUPONT Alice/i)).toBeInTheDocument();
    expect(screen.getAllByText('Rééducation cheville').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Suivi post-opératoire ancien')).toBeInTheDocument();
  });

  it('renders encounters, finalized notes in read-only and drafts with action buttons', () => {
    render(
      <ClinicalRecordManager
        patient={mockPatient}
        initialEpisodes={mockEpisodes}
        initialEncountersByEpisode={mockEncountersByEpisode}
        initialEligibleAppointments={mockEligibleAppointments}
      />,
    );

    // Finalized note content & badge
    expect(screen.getByText('Mobilisation passive sans douleur.')).toBeInTheDocument();
    expect(screen.getByText('Finalisée')).toBeInTheDocument();

    // Draft note content & action buttons
    expect(screen.getByText('Brouillon en cours de rédaction.')).toBeInTheDocument();
    expect(screen.getByText('Modifier')).toBeInTheDocument();
    expect(screen.getByText('Finaliser')).toBeInTheDocument();
  });

  it('shows finalization confirmation alert when clicking Finaliser on draft', () => {
    render(
      <ClinicalRecordManager
        patient={mockPatient}
        initialEpisodes={mockEpisodes}
        initialEncountersByEpisode={mockEncountersByEpisode}
        initialEligibleAppointments={mockEligibleAppointments}
      />,
    );

    const finalizeBtn = screen.getByText('Finaliser');
    fireEvent.click(finalizeBtn);

    expect(
      screen.getByText(/Confirmation de finalisation immuable/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Oui, finaliser la note')).toBeInTheDocument();
  });

  it('renders closed episode with lock indicator and no mutation buttons', () => {
    render(
      <ClinicalRecordManager
        patient={mockPatient}
        initialEpisodes={mockEpisodes}
        initialEncountersByEpisode={mockEncountersByEpisode}
        initialEligibleAppointments={mockEligibleAppointments}
      />,
    );

    // Click on closed episode
    const closedEpisodeItem = screen.getByText('Suivi post-opératoire ancien');
    fireEvent.click(closedEpisodeItem);

    expect(screen.getByText('Clôturé (lecture seule)')).toBeInTheDocument();
    expect(screen.queryByText('Ajouter une séance')).not.toBeInTheDocument();
    expect(screen.queryByText('Clôturer l’épisode')).not.toBeInTheDocument();
  });
});
