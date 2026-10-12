// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingGuide from '@/components/onboarding/OnboardingGuide';
import { useAuth } from '@/components/auth/AuthContext';

vi.mock('@/components/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/dashboard' }));

beforeEach(() => localStorage.clear());
describe('OnboardingGuide pour tous les univers', () => {
  it.each(['other', 'health', 'field_services'])('reste disponible pour %s, même après la prise en main initiale', sector => {
    vi.mocked(useAuth).mockReturnValue({ user: { onboardingCompleted: true, profileType: 'professional' }, organization: { sector }, isLoading: false } as unknown as ReturnType<typeof useAuth>);
    render(<OnboardingGuide />);
    expect(screen.getByLabelText('Comprendre cette page')).toBeVisible();
    expect(screen.getByLabelText('Aide contextuelle')).toBeVisible();
    fireEvent.click(screen.getByLabelText('Réduire l’aide'));
    expect(screen.queryByLabelText('Aide contextuelle')).toBeNull();
    fireEvent.click(screen.getByLabelText('Comprendre cette page'));
    expect(screen.getByLabelText('Aide contextuelle')).toBeVisible();
  });
  it('ne monte pas le guide professionnel pour un compte client', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { profileType: 'client' }, isLoading: false } as unknown as ReturnType<typeof useAuth>);
    render(<OnboardingGuide />);
    expect(screen.queryByLabelText('Comprendre cette page')).toBeNull();
  });
});
