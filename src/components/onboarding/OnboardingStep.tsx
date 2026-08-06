'use client';

import { OnboardingStep as OnboardingStepType } from '@/lib/data/interfaces';
import { CheckCircleIcon, CircleIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import OnboardingTooltip from './OnboardingTooltip';
import OnboardingVideo from './OnboardingVideo';

const StepTitle = ({ step }: { step: OnboardingStepType }) => (
  <h4 className={`text-sm font-medium ${step.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
    {step.title} {step.required && <span className="text-xs text-red-500 font-normal no-underline">*</span>}
  </h4>
);

export default function OnboardingStepItem({ 
  step, 
  onComplete 
}: { 
  step: OnboardingStepType; 
  onComplete: () => void 
}) {
  const [isMarking, setIsMarking] = useState(false);

  const handleComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMarking(true);
    setTimeout(() => {
      onComplete();
      setIsMarking(false);
    }, 500); // Simulate network request
  };

  return (
    <div className={`border rounded-lg p-4 transition-all ${step.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-indigo-100 shadow-sm'}`}>
      <div className="flex items-start gap-4">
        <button 
          onClick={handleComplete}
          disabled={step.completed || isMarking}
          className="flex-shrink-0 mt-1 focus:outline-none"
        >
          {step.completed ? (
            <CheckCircleIcon className="w-6 h-6 text-green-500" />
          ) : (
            <CircleIcon className="w-6 h-6 text-gray-300 hover:text-indigo-400" />
          )}
        </button>
        
        <div className="flex-1">
          {step.tooltip ? (
            <OnboardingTooltip text={step.tooltip}>
              <StepTitle step={step} />
            </OnboardingTooltip>
          ) : (
            <StepTitle step={step} />
          )}
          
          <p className="mt-1 text-sm text-gray-500">{step.description}</p>
          
          {step.videoUrl && (
            <div className="mt-3">
              <OnboardingVideo url={step.videoUrl} />
            </div>
          )}
          
          {!step.completed && step.link && (
            <div className="mt-3 flex items-center justify-between">
              <Link 
                href={step.link}
                className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Faire cette action <ChevronRightIcon className="w-4 h-4 ml-1" />
              </Link>
              <button 
                onClick={handleComplete}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Marquer comme fait
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
