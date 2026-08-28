'use client';

import React from 'react';
import { useOnboardingContext } from './OnboardingProvider';
import OnboardingLauncher from './OnboardingLauncher';
import SetupGuidePopover from './SetupGuidePopover';
import ProductTour from './ProductTour';

export default function OnboardingGuide() {
  const { onboardingState, isMinimized, setMinimized } = useOnboardingContext();

  if (!onboardingState || onboardingState.completed) return null;
  
  if (isMinimized) {
    return (
      <button 
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-indigo-700 z-50 font-medium"
      >
        Continuer la configuration
      </button>
    );
  }



  return (
    <>
      <OnboardingLauncher />
      <SetupGuidePopover />
      <ProductTour />
    </>
  );
}
