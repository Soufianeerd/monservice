// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PatientForm from '@/components/patients/PatientForm';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/app/actions/patient-registry.actions', () => ({
  createPatientAction: vi.fn(),
  updatePatientAction: vi.fn(),
}));

describe('PatientForm Component', () => {
  it('renders all required form fields with labels', () => {
    render(<PatientForm />);

    expect(screen.getByLabelText(/^Nom de naissance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Premier prénom de naissance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Tous les prénoms de naissance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Date de naissance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Sexe administratif/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nom d'usage/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Prénom d'usage/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Commune de naissance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Code INSEE commune/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Pays de naissance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Adresse e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Numéro de téléphone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Adresse postale/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Code postal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Ville/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Pays de résidence/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /créer le patient/i })).toBeInTheDocument();
  });
});
