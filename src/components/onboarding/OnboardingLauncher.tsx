'use client';

import React from 'react';
import { Compass } from 'lucide-react';
import { useOnboardingContext } from './OnboardingProvider';

export default function OnboardingLauncher() {
  const { onboardingState, isMinimized, setMinimized } = useOnboardingContext();

  // Hide entirely if completed or no state
  if (!onboardingState || onboardingState.completed) return null;
  // Hide if it's already open
  if (!isMinimized) return null;

  const completedCount = onboardingState.steps.filter(s => s.completed).length;
  const total = onboardingState.steps.length;

  return (
    <button
      onClick={() => setMinimized(false)}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 bg-white border border-gray-200 shadow-xl hover:shadow-2xl hover:bg-gray-50 text-gray-800 px-4 py-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      aria-label="Ouvrir le guide de prise en main"
    >
      <Compass className="w-5 h-5 text-indigo-600" />
      <span className="font-medium text-sm hidden sm:inline-block">Prise en main</span>
      <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
        {completedCount}/{total}
      </span>
    </button>
  );
}
