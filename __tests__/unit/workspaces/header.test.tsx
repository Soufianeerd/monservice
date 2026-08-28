// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '@/components/layout/Header';
import { useAuth } from '@/components/auth/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';

vi.mock('@/components/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useWorkspace', () => ({
  useWorkspace: vi.fn(),
}));

vi.mock('@/components/crm/GlobalSearchBar', () => ({
  default: () => <div data-testid="global-search-bar">Search</div>,
}));

vi.mock('@/components/crm/NotificationCenter', () => ({
  default: () => <div>NotificationCenter</div>,
}));

vi.mock('@/app/actions/notification', () => ({
  generateNotificationsAction: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/components/layout/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">Lang</div>,
}));

describe('Header Workspace Dynamic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche la recherche globale et l\'industrie pour un professionnel générique', () => {
    (useAuth as any).mockReturnValue({
      user: { profileType: 'professional', id: 'u1', name: 'Jean' },
      organization: { id: 'o1', name: 'Mon Entreprise', industry: 'BTP' },
      signOut: vi.fn(),
    });
    (useWorkspace as any).mockReturnValue({
      type: 'generic',
    });

    render(<Header />);
    
    // Attendre que le composant soit monté (useEffect setMounted)
    expect(screen.getByText('BTP')).toBeInTheDocument();
    expect(screen.getByTestId('global-search-bar')).toBeInTheDocument();
    
    // Lien de profil
    const profileLink = screen.getByLabelText('Profil utilisateur');
    expect(profileLink).toHaveAttribute('href', '/parametres/profil');
  });

  it('masque la recherche et affiche le label pour un professionnel paramédical', () => {
    (useAuth as any).mockReturnValue({
      user: { profileType: 'professional', id: 'u1', name: 'Jean' },
      organization: { id: 'o1', name: 'Mon Cabinet', industry: 'Santé' },
      signOut: vi.fn(),
    });
    (useWorkspace as any).mockReturnValue({
      type: 'paramedical',
      label: 'Masseur-Kinésithérapeute',
    });

    render(<Header />);
    
    // Le label prime sur l'industrie
    expect(screen.getByText('Masseur-Kinésithérapeute')).toBeInTheDocument();
    expect(screen.queryByText('Santé')).not.toBeInTheDocument();
    
    // La recherche est masquée
    expect(screen.queryByTestId('global-search-bar')).not.toBeInTheDocument();
  });

  it('affiche Espace Paramédical si aucun métier paramédical n\'est défini', () => {
    (useAuth as any).mockReturnValue({
      user: { profileType: 'professional', id: 'u1', name: 'Jean' },
      organization: { id: 'o1', name: 'Mon Cabinet', industry: 'Santé' },
      signOut: vi.fn(),
    });
    (useWorkspace as any).mockReturnValue({
      type: 'paramedical',
      // pas de label, devrait fallback sur 'Espace Paramédical'
    });

    render(<Header />);
    
    expect(screen.getByText('Espace Paramédical')).toBeInTheDocument();
  });

  it('masque la recherche globale pour un profil client', () => {
    (useAuth as any).mockReturnValue({
      user: { profileType: 'client', id: 'u1', name: 'Paul' },
      organization: null,
      signOut: vi.fn(),
    });
    (useWorkspace as any).mockReturnValue(null);

    render(<Header />);
    
    expect(screen.queryByTestId('global-search-bar')).not.toBeInTheDocument();
    
    // Lien de profil client
    const profileLink = screen.getByLabelText('Profil utilisateur');
    expect(profileLink).toHaveAttribute('href', '/client/profile');
  });
});
