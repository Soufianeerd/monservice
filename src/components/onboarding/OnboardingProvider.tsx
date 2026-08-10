'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useTourEngine } from '@/hooks/useTourEngine';
import { TourScenario, TourStep } from '@/lib/data/interfaces/tour.interface';

interface OnboardingContextType {
  // Global Setup Guide state
  onboardingState: ReturnType<typeof useOnboarding>['state'];
  completeStep: (stepId: number) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  isMinimized: boolean;
  setMinimized: (val: boolean) => void;
  
  // Product Tour state
  activeTour: TourScenario | null;
  currentTourStep: TourStep | null;
  currentStepIndex: number;
  startTour: (tourId: string) => void;
  nextTourStep: () => void;
  endTour: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { state: onboardingState, completeStep, skipOnboarding } = useOnboarding();
  const { activeTour, currentStep: currentTourStep, currentStepIndex, startTour, nextStep: nextTourStep, endTour } = useTourEngine();
  
  const [isMinimized, setMinimized] = useState(true);

  // Restore minimized state from localStorage if available
  useEffect(() => {
    const stored = localStorage.getItem('monservice_onboarding_minimized');
    if (stored !== null) {
      setMinimized(stored === 'true');
    } else {
      // By default open if not completed
      if (onboardingState && !onboardingState.completed) {
        setMinimized(false);
      }
    }
  }, [onboardingState?.completed]); // run once but wait for state

  const handleSetMinimized = (val: boolean) => {
    setMinimized(val);
    localStorage.setItem('monservice_onboarding_minimized', String(val));
  };

  return (
    <OnboardingContext.Provider value={{
      onboardingState,
      completeStep,
      skipOnboarding,
      isMinimized,
      setMinimized: handleSetMinimized,
      activeTour,
      currentTourStep,
      currentStepIndex,
      startTour,
      nextTourStep,
      endTour
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboardingContext = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboardingContext must be used within OnboardingProvider');
  return ctx;
};
