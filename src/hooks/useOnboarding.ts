import { useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { getOnboardingSteps } from '@/lib/services/onboarding.service';

export function useOnboarding() {
  const { user, updateUser } = useAuth();

  const state = useMemo(() => {
    if (user && !user.onboardingCompleted) {
      const steps = getOnboardingSteps(user.profileType, user.sector);
      const updatedSteps = steps.map(step => ({
        ...step,
        completed: step.id <= user.onboardingStep
      }));
      
      return {
        profileType: user.profileType,
        sector: user.sector,
        currentStep: user.onboardingStep,
        steps: updatedSteps,
        completed: user.onboardingCompleted,
      };
    }
    return null;
  }, [user]);

  const completeStep = async (stepId: number) => {
    if (!state || !user) return;
    
    const updatedSteps = state.steps.map(s => s.id === stepId ? { ...s, completed: true } : s);
    const newCurrentStep = Math.max(state.currentStep, stepId);
    const allRequiredCompleted = updatedSteps.filter(s => s.required).every(s => s.completed);
    
    await updateUser({
      onboardingStep: newCurrentStep,
      onboardingCompleted: allRequiredCompleted
    });
  };

  const skipOnboarding = async () => {
    if (!user) return;
    await updateUser({ onboardingCompleted: true });
  };

  return {
    state,
    completeStep,
    skipOnboarding
  };
}
