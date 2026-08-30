// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '@/components/layout/Header';
import { useAuth } from '@/components/auth/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { resolveWorkspace } from '@/lib/workspaces/resolver';

import { Organization, User } from '@/lib/data/interfaces';

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

  const createMockAuth = (userType: 'professional' | 'client', org: Partial<Organization> | null = null): ReturnType<typeof useAuth> => ({
    user: { profileType: userType, id: 'u1', name: 'Jean' } as unknown as User,
    organization: org as unknown as Organization,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    refresh: vi.fn(),
    updateUser: vi.fn(),
  });

  it('affiche la recherche globale et l\'industrie pour un professionnel générique', () => {
    const org = { id: 'o1', name: 'Mon Entreprise', sector: 'artisan', industry: 'BTP' };
    vi.mocked(useAuth).mockReturnValue(createMockAuth('professional', org));
    vi.mocked(useWorkspace).mockReturnValue(resolveWorkspace({ sector: 'artisan' }));

    render(<Header />);
    
    // Attendre que le composant soit monté (useEffect setMounted)
    expect(screen.getByText('BTP')).toBeInTheDocument();
    expect(screen.getByTestId('global-search-bar')).toBeInTheDocument();
    
    // Lien de profil
    const profileLink = screen.getByLabelText('Profil utilisateur');
    expect(profileLink).toHaveAttribute('href', '/parametres/profil');
  });

  it('masque la recherche et affiche le label pour un professionnel paramédical', () => {
    const org = { id: 'o1', name: 'Mon Cabinet', sector: 'health', profession: 'physiotherapist' as const, industry: 'Santé' };
    vi.mocked(useAuth).mockReturnValue(createMockAuth('professional', org));
    vi.mocked(useWorkspace).mockReturnValue(resolveWorkspace({ sector: 'health', profession: 'physiotherapist' }));

    render(<Header />);
    
    // Le label prime sur l'industrie
    expect(screen.getByText('Masseur-Kinésithérapeute')).toBeInTheDocument();
    expect(screen.queryByText('Santé')).not.toBeInTheDocument();
    
    // La recherche est masquée
    expect(screen.queryByTestId('global-search-bar')).not.toBeInTheDocument();
  });

  it('affiche Espace Paramédical si aucun métier paramédical n\'est défini', () => {
    const org = { id: 'o1', name: 'Mon Cabinet', sector: 'health', industry: 'Santé' };
    vi.mocked(useAuth).mockReturnValue(createMockAuth('professional', org));
    vi.mocked(useWorkspace).mockReturnValue(resolveWorkspace({ sector: 'health', profession: null }));

    render(<Header />);
    
    expect(screen.getByText('Espace Paramédical')).toBeInTheDocument();
  });

  it('masque la recherche globale pour un profil client', () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuth('client', null));
    vi.mocked(useWorkspace).mockReturnValue(null);

    render(<Header />);
    
    expect(screen.queryByTestId('global-search-bar')).not.toBeInTheDocument();
    
    // Lien de profil client
    const profileLink = screen.getByLabelText('Profil utilisateur');
    expect(profileLink).toHaveAttribute('href', '/client/profile');
  });
});
