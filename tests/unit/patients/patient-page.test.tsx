// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PatientList from '@/components/patients/PatientList';
import { PatientListResult } from '@/lib/patients/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/app/actions/patient-registry.actions', () => ({
  listPatientsAction: vi.fn(),
}));

describe('PatientList Component', () => {
  const initialData: PatientListResult = {
    rows: [
      {
        id: 'patient-1',
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
        email: 'alice@example.com',
        phone: '0612345678',
        address: '10 rue de Paris',
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
        isActive: true,
      },
      {
        id: 'patient-2',
        birthName: 'DURAND',
        firstBirthName: 'Bob',
        birthFirstNames: null,
        usedName: null,
        usedFirstName: null,
        birthDate: '1985-11-20',
        sex: 'male',
        birthPlace: null,
        birthPlaceCode: null,
        birthCountry: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        postalCode: null,
        country: null,
        isActive: false,
      },
    ],
    total: 2,
    limit: 25,
    offset: 0,
  };

  it('renders title, actions and patient rows correctly', () => {
    render(<PatientList initialData={initialData} />);

    expect(screen.getByText('Registre des Patients')).toBeInTheDocument();
    expect(screen.getByText('Nouveau patient')).toBeInTheDocument();

    // Patient 1
    expect(screen.getByText('MARTIN Alice')).toBeInTheDocument();
    expect(screen.getByText('Nom de naissance : DUPONT')).toBeInTheDocument();
    expect(screen.getByText('0612345678')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();

    // Patient 2
    expect(screen.getByText('DURAND Bob')).toBeInTheDocument();
    expect(screen.getByText('Archivé')).toBeInTheDocument();
  });

  it('renders filter inputs correctly', () => {
    render(<PatientList initialData={initialData} />);

    expect(screen.getByLabelText(/^Nom \(naissance \/ usage\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Prénom \(naissance \/ usage\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Date de naissance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Statut/i)).toBeInTheDocument();
  });

  it('renders empty state when no patients found', () => {
    render(
      <PatientList
        initialData={{
          rows: [],
          total: 0,
          limit: 25,
          offset: 0,
        }}
      />
    );

    expect(screen.getByText('Aucun patient trouvé')).toBeInTheDocument();
  });
});
