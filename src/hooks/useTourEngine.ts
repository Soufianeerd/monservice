import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TourScenario } from '@/lib/data/interfaces';
import { TOUR_SCENARIOS } from '@/components/onboarding/definitions/tour-scenarios';

export function useTourEngine() {
  const router = useRouter();
  const pathname = usePathname();
  
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const activeTour: TourScenario | null = activeTourId ? TOUR_SCENARIOS[activeTourId] : null;
  const currentStep = activeTour?.steps[currentStepIndex] || null;

  const startTour = useCallback((tourId: string) => {
    setActiveTourId(tourId);
    setCurrentStepIndex(0);
  }, []);

  const endTour = useCallback(() => {
    setActiveTourId(null);
    setCurrentStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    if (activeTour && currentStepIndex < activeTour.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      endTour();
    }
  }, [activeTour, currentStepIndex, endTour]);

  // Handle route changes enforced by the current step
  useEffect(() => {
    if (currentStep?.route && pathname !== currentStep.route) {
      router.push(currentStep.route);
    }
  }, [currentStep, pathname, router]);

  // Handle target-click advance mode
  useEffect(() => {
    if (!currentStep || currentStep.advanceOn !== 'target-click') return;

    const handleTargetClick = (e: MouseEvent) => {
      // Allow slight delay to let the click propagate
      setTimeout(() => {
        nextStep();
      }, 50);
    };

    const attemptAttach = () => {
      const targetEl = document.querySelector(currentStep.target);
      if (targetEl) {
        targetEl.addEventListener('click', handleTargetClick as EventListener);
        return targetEl;
      }
      return null;
    };

    let targetEl = attemptAttach();
    
    // Fallback using MutationObserver if target isn't immediately available
    let observer: MutationObserver | null = null;
    if (!targetEl) {
      observer = new MutationObserver(() => {
        targetEl = attemptAttach();
        if (targetEl && observer) {
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      if (targetEl) {
        targetEl.removeEventListener('click', handleTargetClick as EventListener);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [currentStep, nextStep]);

  return {
    activeTour,
    currentStep,
    currentStepIndex,
    startTour,
    nextStep,
    endTour,
  };
}
