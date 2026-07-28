import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { getOnboardingSteps } from '@/lib/services/onboarding.service';
import { OnboardingState } from '@/lib/data/interfaces';

export function useOnboarding() {
  const { user, updateUser } = useAuth();
  const [state, setState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      const steps = getOnboardingSteps(user.profileType, user.sector);
      const updatedSteps = steps.map(step => ({
        ...step,
        completed: step.id <= user.onboardingStep
      }));
      
      setState({
        profileType: user.profileType,
        sector: user.sector,
        currentStep: user.onboardingStep,
        steps: updatedSteps,
        completed: user.onboardingCompleted,
      });
    } else {
      setState(null);
    }
  }, [user]);

  const completeStep = async (stepId: number) => {
    if (!state || !user) return;
    
    const updatedSteps = state.steps.map(s => s.id === stepId ? { ...s, completed: true } : s);
    const newCurrentStep = Math.max(state.currentStep, stepId);
    const allRequiredCompleted = updatedSteps.filter(s => s.required).every(s => s.completed);
    
    setState(prev => prev ? { ...prev, steps: updatedSteps, currentStep: newCurrentStep, completed: allRequiredCompleted } : null);
    
    await updateUser({
      onboardingStep: newCurrentStep,
      onboardingCompleted: allRequiredCompleted
    });
  };

  const skipOnboarding = async () => {
    if (!user) return;
    setState(null);
    await updateUser({ onboardingCompleted: true });
  };

  return {
    state,
    completeStep,
    skipOnboarding
  };
}
