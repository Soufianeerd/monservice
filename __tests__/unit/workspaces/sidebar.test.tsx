// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { useRole } from '@/hooks/useRole';
import { useWorkspace } from '@/hooks/useWorkspace';
import { resolveWorkspace } from '@/lib/workspaces/resolver';

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
    vi.mocked(useRole).mockReturnValue('professional');
    vi.mocked(useWorkspace).mockReturnValue(resolveWorkspace({ sector: 'artisan' }));

    render(<Sidebar />);
    
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Deals')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Messagerie')).toBeInTheDocument();
  });

  it('masque les modules CRM inutiles pour le paramédical', () => {
    vi.mocked(useRole).mockReturnValue('professional');
    vi.mocked(useWorkspace).mockReturnValue(resolveWorkspace({ sector: 'health', profession: 'osteopath' }));

    render(<Sidebar />);
    
    expect(screen.queryByText('Clients')).not.toBeInTheDocument();
    expect(screen.queryByText('Deals')).not.toBeInTheDocument();
    expect(screen.queryByText('Marketplace')).not.toBeInTheDocument();
    expect(screen.queryByText('Messagerie')).not.toBeInTheDocument();
    
    // Affiche 'Patients' pour le paramédical
    expect(screen.getByText('Patients')).toBeInTheDocument();

    // Et affiche les autres modules restants
    expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    expect(screen.getByText('Facturation')).toBeInTheDocument();
    expect(screen.getByText('Agenda')).toBeInTheDocument();
    expect(screen.getByText('Paramètres')).toBeInTheDocument();
  });

  it('affiche la terminologie adéquate dans Facturation pour le paramédical', () => {
    vi.mocked(useRole).mockReturnValue('professional');
    // On utilise psychomotor_therapist (qui a la terminologie 'Séances')
    vi.mocked(useWorkspace).mockReturnValue(resolveWorkspace({ sector: 'health', profession: 'psychomotor_therapist' }));

    vi.mocked(usePathname).mockReturnValueOnce('/facturation');

    render(<Sidebar />);
    
    // Au lieu de "Produits", on doit voir "Consultations" dans le menu déroulant
    expect(screen.getByText('Consultations')).toBeInTheDocument();
  });

  it('affiche la navigation client sans utiliser le workspace', () => {
    vi.mocked(useRole).mockReturnValue('client');
    vi.mocked(useWorkspace).mockReturnValue(null);

    render(<Sidebar />);
    
    expect(screen.getByText('Mes demandes')).toBeInTheDocument();
    expect(screen.getByText('Devis reçus')).toBeInTheDocument();
  });
});
