'use client';

import { useWorkspace } from '@/hooks/useWorkspace';
import ContextualHelp from './ContextualHelp';

export default function OnboardingGuide() {
  const workspace = useWorkspace();
  return workspace ? <ContextualHelp /> : null;
}
