// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { useRole } from '@/hooks/useRole';
import { useWorkspace } from '@/hooks/useWorkspace';

vi.mock('@/hooks/useRole', () => ({
  useRole: vi.fn(),
}));

vi.mock('@/hooks/useWorkspace', () => ({
  useWorkspace: vi.fn(),
}));

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}));

describe('Sidebar Workspace Dynamic Navigation', () => {
  it('affiche la navigation générique complète pour un professionnel classique', () => {
    (useRole as any).mockReturnValue('professional');
    (useWorkspace as any).mockReturnValue({
      type: 'generic',
      sector: 'other',
      label: 'CRM',
    });

    render(<Sidebar />);
    
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Deals')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Messagerie')).toBeInTheDocument();
  });

  it('masque les modules CRM inutiles pour le paramédical', () => {
    (useRole as any).mockReturnValue('professional');
    (useWorkspace as any).mockReturnValue({
      type: 'paramedical',
      sector: 'health',
      profession: 'osteopath',
      label: 'Ostéopathe',
      terminology: { servicePlural: 'Consultations' }
    });

    render(<Sidebar />);
    
    expect(screen.queryByText('Clients')).not.toBeInTheDocument();
    expect(screen.queryByText('Deals')).not.toBeInTheDocument();
    expect(screen.queryByText('Marketplace')).not.toBeInTheDocument();
    expect(screen.queryByText('Messagerie')).not.toBeInTheDocument();
    
    // N'affiche jamais 'Patients' dans la session 05
    expect(screen.queryByText('Patients')).not.toBeInTheDocument();

    // Mais affiche les modules restants
    expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    expect(screen.getByText('Facturation')).toBeInTheDocument();
    expect(screen.getByText('Agenda')).toBeInTheDocument();
    expect(screen.getByText('Paramètres')).toBeInTheDocument();
  });

  it('affiche la terminologie adéquate dans Facturation pour le paramédical', () => {
    (useRole as any).mockReturnValue('professional');
    (useWorkspace as any).mockReturnValue({
      type: 'paramedical',
      sector: 'health',
      profession: 'psychologist',
      label: 'Psychologue',
      terminology: { servicePlural: 'Séances' }
    });

    vi.mocked(usePathname).mockReturnValueOnce('/facturation');

    render(<Sidebar />);
    
    // Au lieu de "Produits", on doit voir "Séances" dans le menu déroulant
    expect(screen.getByText('Séances')).toBeInTheDocument();
  });

  it('affiche la navigation client sans utiliser le workspace', () => {
    (useRole as any).mockReturnValue('client');
    (useWorkspace as any).mockReturnValue(null);

    render(<Sidebar />);
    
    expect(screen.getByText('Mes demandes')).toBeInTheDocument();
    expect(screen.getByText('Devis reçus')).toBeInTheDocument();
  });
});
