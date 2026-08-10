import React from 'react';

export type AdvanceMode = 
  | "manual-next" 
  | "target-click" 
  | "route-change" 
  | "condition" 
  | "entity-created";

export type PlacementOptions = 
  | "top" 
  | "bottom" 
  | "left" 
  | "right" 
  | "top-start" 
  | "top-end" 
  | "bottom-start" 
  | "bottom-end"
  | "left-start"
  | "left-end"
  | "right-start"
  | "right-end";

export interface TourStep {
  id: string;
  route?: string; // S'il y a besoin de navigation avant
  target: string; // ex: '[data-tour="dashboard-overview"]'
  title?: string;
  content: string | React.ReactNode;
  placement?: PlacementOptions;
  advanceOn: AdvanceMode;
  showNextButton?: boolean;
}

export interface TourScenario {
  id: string; // Doit correspondre à l'ID du step principal (onboardingStep)
  title: string;
  steps: TourStep[];
}
