'use client';

import React, { useEffect, useState } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { useOnboardingContext } from './OnboardingProvider';
import TourSpotlight from './TourSpotlight';
import { XIcon } from 'lucide-react';

export default function ProductTour() {
  const { currentTourStep, activeTour, currentStepIndex, nextTourStep, endTour } = useOnboardingContext();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const { refs, floatingStyles, update } = useFloating({
    placement: currentTourStep?.placement || 'bottom',
    middleware: [
      offset(12),
      flip({ fallbackAxisSideDirection: 'end' }),
      shift({ padding: 16 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Track the target element
  useEffect(() => {
    if (!currentTourStep) {
      setTargetRect(null);
      return;
    }

    const attachToTarget = () => {
      const el = document.querySelector(currentTourStep.target);
      if (el) {
        refs.setReference(el);
        setTargetRect(el.getBoundingClientRect());
        
        // Scroll into view if not visible
        const rect = el.getBoundingClientRect();
        const isInViewport = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
        
        if (!isInViewport) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        refs.setReference(null);
        setTargetRect(null);
      }
    };

    attachToTarget();

    // Use MutationObserver to catch elements that appear dynamically (e.g. modals, fetch results)
    const observer = new MutationObserver(() => {
      if (!refs.reference.current) {
        attachToTarget();
      } else {
        // Update rect if element might have moved
        const el = document.querySelector(currentTourStep.target);
        if (el) setTargetRect(el.getBoundingClientRect());
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    
    // Also update on scroll/resize
    window.addEventListener('scroll', attachToTarget, { passive: true });
    window.addEventListener('resize', attachToTarget, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', attachToTarget);
      window.removeEventListener('resize', attachToTarget);
    };
  }, [currentTourStep, refs]);

  // Keyboard navigation
  useEffect(() => {
    if (!activeTour) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        endTour();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTour, endTour]);

  if (!activeTour || !currentTourStep) return null;

  // Don't render coachmark if target isn't found yet
  if (!refs.reference.current) return null;

  const totalSteps = activeTour.steps.length;

  return (
    <>
      <TourSpotlight targetRect={targetRect} />
      
      <div 
        ref={refs.setFloating}
        style={floatingStyles}
        className="z-[100] w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-4"
        role="dialog"
        aria-label="Tutoriel interactif"
      >
        <div className="flex justify-between items-start mb-2">
          {currentTourStep.title && (
            <h3 className="font-bold text-gray-900 text-sm">{currentTourStep.title}</h3>
          )}
          <button 
            onClick={endTour}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded -mt-1 -mr-1 p-1"
            aria-label="Fermer le tutoriel"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        
        <div className="text-sm text-gray-600 mb-4 leading-relaxed">
          {currentTourStep.content}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-gray-400">
            {currentStepIndex + 1} / {totalSteps}
          </div>
          
          {currentTourStep.showNextButton && (
            <button 
              onClick={nextTourStep}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-1.5 px-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Suivant &rarr;
            </button>
          )}
          
          {currentTourStep.advanceOn === 'target-click' && !currentTourStep.showNextButton && (
            <div className="text-xs text-indigo-600 font-medium animate-pulse">
              Cliquez pour continuer
            </div>
          )}
          {currentTourStep.advanceOn === 'entity-created' && !currentTourStep.showNextButton && (
            <div className="text-xs text-indigo-600 font-medium">
              Action requise
            </div>
          )}
        </div>
      </div>
    </>
  );
}
