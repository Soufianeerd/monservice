'use client';

import React from 'react';
import { useOnboardingContext } from './OnboardingProvider';
import OnboardingLauncher from './OnboardingLauncher';
import SetupGuidePopover from './SetupGuidePopover';
import { useWorkspace } from '@/hooks/useWorkspace';
import ContextualHelp from './ContextualHelp';
import ProductTour from './ProductTour';

export default function OnboardingGuide() {
  const { onboardingState } = useOnboardingContext();
  const workspace = useWorkspace();
  if (workspace?.type === 'paramedical') return <ContextualHelp />;

  if (!onboardingState || onboardingState.completed) return null;

  return (
    <>
      <OnboardingLauncher />
      <SetupGuidePopover />
      <ProductTour />
    </>
  );
}
