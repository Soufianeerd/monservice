'use client';

import React, { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingProvider } from './OnboardingProvider';
import OnboardingLauncher from './OnboardingLauncher';
import SetupGuidePopover from './SetupGuidePopover';
import ProductTour from './ProductTour';

export default function OnboardingGuide() {
  const { state } = useOnboarding();
  const [isOpen, setIsOpen] = useState(true);

  if (!state || state.completed) return null;
  
  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-indigo-700 z-50 font-medium"
      >
        Continuer la configuration
      </button>
    );
  }



  return (
    <>
      {isMinimized ? (
        <OnboardingLauncher />
      ) : (
        <SetupGuidePopover />
      )}
      <ProductTour />
    </>
  );
}
