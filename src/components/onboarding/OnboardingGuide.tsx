'use client';

import { useOnboarding } from '@/hooks/useOnboarding';
import OnboardingProgress from './OnboardingProgress';
import OnboardingStepItem from './OnboardingStep';
import { XIcon } from 'lucide-react';
import { useState } from 'react';

export default function OnboardingGuide() {
  const { state, completeStep, skipOnboarding } = useOnboarding();
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

  const completedCount = state.steps.filter(s => s.completed).length;
  const progress = Math.round((completedCount / state.steps.length) * 100);

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-900">Bienvenue sur MonService !</h2>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Pour profiter pleinement de la plateforme, nous vous suggérons de compléter ces quelques étapes.
          </p>

          <OnboardingProgress progress={progress} completedCount={completedCount} totalCount={state.steps.length} />

          <div className="mt-8 space-y-4">
            {state.steps.map(step => (
              <OnboardingStepItem 
                key={step.id} 
                step={step} 
                onComplete={() => completeStep(step.id)} 
              />
            ))}
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end">
          <button 
            onClick={skipOnboarding}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Ignorer pour le moment
          </button>
        </div>
      </div>
    </div>
  );
}
