import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PracticeStructureManager } from '@/components/practice/PracticeStructureManager';
import type { PracticeStructureOverview } from '@/lib/practice-structure/types';

vi.mock('@/app/actions/practice-structure.actions', () => ({
  createPracticeLocationAction: vi.fn(),
  updatePracticeLocationAction: vi.fn(),
  setPrimaryPracticeLocationAction: vi.fn(),
  setPracticeLocationActiveAction: vi.fn(),
  createPracticePractitionerAction: vi.fn(),
  updatePracticePractitionerAction: vi.fn(),
  setPracticePractitionerActiveAction: vi.fn(),
  setPractitionerLocationsAction: vi.fn(),
  createPracticeRoomAction: vi.fn(),
  updatePracticeRoomAction: vi.fn(),
  setPracticeRoomActiveAction: vi.fn(),
  createPracticeResourceAction: vi.fn(),
  updatePracticeResourceAction: vi.fn(),
  setPracticeResourceActiveAction: vi.fn(),
}));

describe('PracticeStructureManager Component', () => {
  const mockEmptyOverview: PracticeStructureOverview = {
    locations: [],
    practitioners: [],
    assignments: [],
    rooms: [],
    resources: [],
    eligibleUsers: [],
  };

  const mockFilledOverview: PracticeStructureOverview = {
    locations: [
      {
        id: 'loc-1',
        name: 'Cabinet Principal',
        address: '10 Rue de la Paix',
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
        timezone: 'Europe/Paris',
        phone: '0102030405',
        isPrimary: true,
        isActive: true,
      },
    ],
    practitioners: [
      {
        id: 'prac-1',
        userId: 'user-1',
        displayName: 'Dr. Jane Doe',
        profession: 'physiotherapist',
        email: 'jane@example.com',
        phone: '0601020304',
        isActive: true,
      },
    ],
    assignments: [
      {
        id: 'assign-1',
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        isPrimary: true,
        isActive: true,
      },
    ],
    rooms: [
      {
        id: 'room-1',
        locationId: 'loc-1',
        name: 'Salle 1',
        description: 'Grande salle',
        isActive: true,
      },
    ],
    resources: [
      {
        id: 'res-1',
        locationId: 'loc-1',
        roomId: 'room-1',
        name: 'Table de massage',
        description: 'Électrique',
        isActive: true,
      },
    ],
    eligibleUsers: [
      {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'Jane Doe',
      },
    ],
  };

  it('renders all 4 tabs and defaults to Lieux de consultation', () => {
    render(<PracticeStructureManager overview={mockEmptyOverview} />);

    expect(screen.getByRole('button', { name: 'Lieux de consultation' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Praticiens' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Salles' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Ressources' })).toBeDefined();
    expect(screen.getByText('Aucun lieu configuré.')).toBeDefined();
  });

  it('displays locations and allows switching tabs to Praticiens with human label', () => {
    render(<PracticeStructureManager overview={mockFilledOverview} />);

    expect(screen.getByText('Cabinet Principal')).toBeDefined();
    expect(screen.getByText('Principal')).toBeDefined();

    // Switch to Praticiens tab
    fireEvent.click(screen.getByRole('button', { name: 'Praticiens' }));

    expect(screen.getByText('Dr. Jane Doe')).toBeDefined();
    expect(screen.getByText('Kinésithérapeute')).toBeDefined();
    expect(screen.getByText('Affecter lieux')).toBeDefined();
  });

  it('switches to Salles and Ressources tabs and renders items correctly', () => {
    render(<PracticeStructureManager overview={mockFilledOverview} />);

    // Salles tab
    fireEvent.click(screen.getByRole('button', { name: 'Salles' }));
    expect(screen.getByText('Salle 1')).toBeDefined();

    // Ressources tab
    fireEvent.click(screen.getByRole('button', { name: 'Ressources' }));
    expect(screen.getByText('Table de massage')).toBeDefined();
  });
});
