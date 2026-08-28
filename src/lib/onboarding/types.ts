export type OnboardingContext =
  | {
      profileType: 'client';
    }
  | {
      profileType: 'professional';
      sector?: string | null;
      profession?: string | null;
    };
