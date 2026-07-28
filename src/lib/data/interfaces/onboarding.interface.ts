import { ProfileType } from './user.interface';

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  action: string;
  link?: string;
  completed: boolean;
  required: boolean;
}

export interface OnboardingState {
  profileType: ProfileType;
  sector?: string;
  currentStep: number;
  steps: OnboardingStep[];
  completed: boolean;
}
