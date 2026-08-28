// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SetupGuidePopover from '@/components/onboarding/SetupGuidePopover';

const mockSetMinimized = vi.fn();
const mockStartTour = vi.fn();
const mockSkipOnboarding = vi.fn();

vi.mock('@/components/onboarding/OnboardingProvider', () => ({
  useOnboardingContext: () => ({
    onboardingState: {
      completed: false,
      steps: [
        { id: 1, title: 'Step 1', action: 'welcome', completed: false }, // no tour
        { id: 2, title: 'Step 2', action: 'discover_dashboard', completed: false, link: '/dashboard' }, // tour exists
        { id: 3, title: 'Step 3', action: 'add_client', completed: false, link: '/clients/new' }, // tour exists
        { id: 4, title: 'Step 4', action: 'complete_profile', completed: false, link: '/profile' }, // no tour but link
        { id: 5, title: 'Step 5', action: 'add_services', completed: false }, // no tour, no link
        { id: 6, title: 'Step 6', action: 'watch_tutorial', completed: false, videoUrl: 'http://example.com' }, // video
      ]
    },
    isMinimized: false,
    setMinimized: mockSetMinimized,
    startTour: mockStartTour,
    skipOnboarding: mockSkipOnboarding
  })
}));

// Mock TOUR_SCENARIOS so we strictly control what has a tour
vi.mock('@/components/onboarding/definitions/tour-scenarios', () => ({
  TOUR_SCENARIOS: {
    discover_dashboard: { id: 'discover_dashboard' },
    add_client: { id: 'add_client' },
  }
}));

describe('SetupGuidePopover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche Continuer et lance le tour si TOUR_SCENARIOS existe (discover_dashboard)', () => {
    render(<SetupGuidePopover />);
    const step2Row = screen.getByText('Step 2').closest('div');
    const continueBtn = step2Row?.querySelector('button');
    expect(continueBtn).toHaveTextContent('Continuer');
    
    fireEvent.click(continueBtn!);
    expect(mockStartTour).toHaveBeenCalledWith('discover_dashboard');
    expect(mockSetMinimized).toHaveBeenCalledWith(true);
  });

  it('affiche Accéder et navigue si step.link existe sans scénario (complete_profile)', () => {
    render(<SetupGuidePopover />);
    const step4Row = screen.getByText('Step 4').closest('div');
    const accessLink = step4Row?.querySelector('a');
    expect(accessLink).toHaveTextContent('Accéder');
    expect(accessLink).toHaveAttribute('href', '/profile');
    
    fireEvent.click(accessLink!);
    expect(mockStartTour).not.toHaveBeenCalled();
    expect(mockSetMinimized).toHaveBeenCalledWith(true);
  });

  it('n\'affiche pas de bouton d\'action si ni tour ni link (add_services)', () => {
    render(<SetupGuidePopover />);
    const step5Row = screen.getByText('Step 5').parentElement;
    const actionsContainer = step5Row?.querySelector('.flex.items-center.gap-4');
    // Il ne doit pas y avoir de bouton Continuer ni de lien Accéder
    expect(actionsContainer?.textContent).toBe('');
  });

  it('n\'affiche pas de bouton Continuer sur welcome', () => {
    render(<SetupGuidePopover />);
    const step1Row = screen.getByText('Step 1').parentElement;
    const actionsContainer = step1Row?.querySelector('.flex.items-center.gap-4');
    expect(actionsContainer?.textContent).toBe('');
  });

  it('affiche le bouton vidéo inactif', () => {
    render(<SetupGuidePopover />);
    const step6Row = screen.getByText('Step 6').parentElement;
    const videoBtn = step6Row?.querySelector('span[title="Bientôt disponible"]');
    expect(videoBtn).toBeInTheDocument();
  });
});
