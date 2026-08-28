// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingGuide from '@/components/onboarding/OnboardingGuide';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { useAuth } from '@/components/auth/AuthContext';

// Mocks
vi.mock('@/components/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/onboarding/ProductTour', () => ({
  default: () => <div data-testid="product-tour">ProductTour</div>,
}));

// No need to mock SetupGuidePopover and OnboardingLauncher, we can test their integration.

describe('OnboardingGuide', () => {
  it('rend ProductTour même lorsque isMinimized est true', () => {
    (useAuth as any).mockReturnValue({
      user: { onboardingCompleted: false, onboardingStep: 1, profileType: 'professional', sector: 'other' },
      organization: { sector: 'other' },
      updateUser: vi.fn(),
    });

    render(
      <OnboardingProvider>
        <OnboardingGuide />
      </OnboardingProvider>
    );

    // On vérifie que ProductTour est là
    expect(screen.getByTestId('product-tour')).toBeInTheDocument();
    
    // Minimize (click cross in popover)
    fireEvent.click(screen.getByLabelText('Réduire le guide'));
    
    // ProductTour should still be mounted
    expect(screen.getByTestId('product-tour')).toBeInTheDocument();
  });
  
  it('laisse le launcher disponible si aucun tour n\'est actif, et masque le launcher sinon', () => {
    (useAuth as any).mockReturnValue({
      user: { onboardingCompleted: false, onboardingStep: 1, profileType: 'professional', sector: 'other' },
      organization: { sector: 'other' },
      updateUser: vi.fn(),
    });

    render(
      <OnboardingProvider>
        <OnboardingGuide />
      </OnboardingProvider>
    );
    
    // Visible initially (because isMinimized defaults to true in OnboardingProvider)
    expect(screen.getByLabelText('Ouvrir le guide de prise en main')).toBeInTheDocument();
    
    // Un-minimize by clicking the launcher
    fireEvent.click(screen.getByLabelText('Ouvrir le guide de prise en main'));
    
    // Launcher is now hidden when popover is open
    expect(screen.queryByLabelText('Ouvrir le guide de prise en main')).not.toBeInTheDocument();
    
    // Start a tour
    const startBtns = screen.getAllByText(/Continuer/);
    fireEvent.click(startBtns[0]); // start the first tour
    
    // Launcher should remain hidden since a tour is active, even though starting a tour minimizes the popover
    expect(screen.queryByLabelText('Ouvrir le guide de prise en main')).not.toBeInTheDocument();
  });
});
