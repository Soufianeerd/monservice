'use client';

import React from 'react';
import { XIcon, CheckCircleIcon, CircleIcon, PlayCircleIcon } from 'lucide-react';
import { useOnboardingContext } from './OnboardingProvider';
import OnboardingProgress from './OnboardingProgress';

export default function SetupGuidePopover() {
  const { onboardingState, isMinimized, setMinimized, startTour, skipOnboarding } = useOnboardingContext();

  if (!onboardingState || onboardingState.completed || isMinimized) return null;

  const completedCount = onboardingState.steps.filter(s => s.completed).length;
  const progress = Math.round((completedCount / onboardingState.steps.length) * 100);

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[90vw] max-w-sm bg-white rounded-xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden max-h-[80vh]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Prise en main</h2>
          <p className="text-xs text-gray-500 mt-0.5">{completedCount} sur {onboardingState.steps.length} étapes terminées</p>
        </div>
        <button 
          onClick={() => setMinimized(true)} 
          className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1"
          aria-label="Réduire le guide"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>
      
      {/* Body */}
      <div className="p-5 overflow-y-auto flex-1">
        <div className="mb-5">
          <OnboardingProgress progress={progress} completedCount={completedCount} totalCount={onboardingState.steps.length} />
        </div>

        <div className="space-y-4">
          {onboardingState.steps.map(step => (
            <div key={step.id} className={`flex items-start gap-3 p-3 rounded-lg border ${step.completed ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex-shrink-0 mt-0.5">
                {step.completed ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                ) : (
                  <CircleIcon className="w-5 h-5 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-medium ${step.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                  {step.title}
                </h4>
                {!step.completed && (
                  <div className="mt-2 flex items-center gap-4">
                    <button
                      onClick={() => {
                        setMinimized(true);
                        startTour(step.action); // L'action correspond à l'ID du scénario
                      }}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none"
                    >
                      Continuer &rarr;
                    </button>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); alert('Vidéo tutoriel à venir !'); }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <PlayCircleIcon className="w-3.5 h-3.5" />
                      Tutoriel vidéo
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-5 py-3 bg-gray-50">
        <button 
          onClick={skipOnboarding}
          className="text-xs font-medium text-gray-500 hover:text-gray-700 focus:outline-none underline-offset-2 hover:underline"
        >
          Ne plus afficher ce guide
        </button>
      </div>
    </div>
  );
}
