// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PatientDetailManager from '@/components/patients/PatientDetailManager';
import { PatientDetailDTO, PatientRepresentativeDTO } from '@/lib/patients/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/app/actions/patient-registry.actions', () => ({
  setPatientActiveAction: vi.fn(),
  updatePatientAction: vi.fn(),
  createRepresentativeAndLinkAction: vi.fn(),
  linkExistingRepresentativeAction: vi.fn(),
  updateRepresentativeAction: vi.fn(),
  updateRepresentativeLinkAction: vi.fn(),
  setRepresentativeLinkActiveAction: vi.fn(),
}));

describe('PatientDetailManager Component', () => {
  const initialDetail: PatientDetailDTO = {
    patient: {
      id: 'patient-123',
      birthName: 'DUPONT',
      firstBirthName: 'Alice',
      birthFirstNames: 'Alice Marie',
      usedName: 'MARTIN',
      usedFirstName: 'Alice',
      birthDate: '1990-05-15',
      sex: 'female',
      birthPlace: 'Paris',
      birthPlaceCode: '75056',
      birthCountry: 'France',
      email: 'alice.dupont@example.com',
      phone: '0612345678',
      address: '10 rue de la Paix',
      city: 'Paris',
      postalCode: '75002',
      country: 'France',
      isActive: true,
    },
    representatives: [
      {
        linkId: 'link-1',
        representativeId: 'rep-1',
        firstName: 'Pierre',
        lastName: 'DUPONT',
        email: 'pierre.dupont@example.com',
        phone: '0687654321',
        address: '10 rue de la Paix',
        city: 'Paris',
        postalCode: '75002',
        country: 'France',
        relationship: 'parent',
        isLegalRepresentative: true,
        isPrimaryContact: true,
        isEmergencyContact: true,
        isBillingContact: true,
        isLinkActive: true,
        isRepresentativeActive: true,
      },
    ],
  };

  const allRepresentatives: PatientRepresentativeDTO[] = [
    {
      id: 'rep-1',
      firstName: 'Pierre',
      lastName: 'DUPONT',
      email: 'pierre.dupont@example.com',
      phone: '0687654321',
      address: '10 rue de la Paix',
      city: 'Paris',
      postalCode: '75002',
      country: 'France',
      isActive: true,
    },
  ];

  it('renders patient identity and coordinates correctly', () => {
    render(
      <PatientDetailManager
        initialDetail={initialDetail}
        allRepresentatives={allRepresentatives}
      />
    );

    // Title
    expect(screen.getByText('MARTIN Alice')).toBeInTheDocument();
    expect(screen.getByText(/Dossier administratif patient #patient-/i)).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();

    // Civil identity details
    expect(screen.getByText('DUPONT')).toBeInTheDocument();
    expect(screen.getByText('Alice Marie')).toBeInTheDocument();
    expect(screen.getByText('Féminin')).toBeInTheDocument();
    expect(screen.getByText(/Paris \(75056\) France/i)).toBeInTheDocument();

    // Coordinates
    expect(screen.getByText('0612345678')).toBeInTheDocument();
    expect(screen.getByText('alice.dupont@example.com')).toBeInTheDocument();
    expect(screen.getByText('10 rue de la Paix')).toBeInTheDocument();
    expect(screen.getByText('75002 Paris')).toBeInTheDocument();

    // Representatives
    expect(screen.getByText('Pierre DUPONT')).toBeInTheDocument();
    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(screen.getByText('Représentant légal')).toBeInTheDocument();
    expect(screen.getByText('Contact principal')).toBeInTheDocument();
    expect(screen.getByText('Urgence')).toBeInTheDocument();
    expect(screen.getByText('Facturation')).toBeInTheDocument();
  });

  it('renders buttons for modifier and archiver', () => {
    render(
      <PatientDetailManager
        initialDetail={initialDetail}
        allRepresentatives={allRepresentatives}
      />
    );

    expect(screen.getByRole('button', { name: /modifier l’identité/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archiver le dossier/i })).toBeInTheDocument();
  });
});
