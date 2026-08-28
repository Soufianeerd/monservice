'use client';

import React from 'react';
import { useOnboardingContext } from './OnboardingProvider';
import OnboardingLauncher from './OnboardingLauncher';
import SetupGuidePopover from './SetupGuidePopover';
import ProductTour from './ProductTour';

export default function OnboardingGuide() {
  const { onboardingState } = useOnboardingContext();

  if (!onboardingState || onboardingState.completed) return null;

  return (
    <>
      <OnboardingLauncher />
      <SetupGuidePopover />
      <ProductTour />
    </>
  );
}
