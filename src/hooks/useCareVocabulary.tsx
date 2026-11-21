'use client';

import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { adaptCareText, vocabularyFromCustomerTerm, type CareVocabulary } from '@/lib/workspaces/paramedical/vocabulary';

const CareVocabularyContext = createContext<CareVocabulary>('patient');

/** Fournit le vocabulaire du métier (patient ou client) aux écrans santé. */
export function CareVocabularyProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();
  const vocabulary = vocabularyFromCustomerTerm(workspace?.terminology?.customerSingular);
  return <CareVocabularyContext.Provider value={vocabulary}>{children}</CareVocabularyContext.Provider>;
}

/** Adapte un texte des écrans santé au vocabulaire du métier (patient ou client). */
export function useCareVocabulary(): (text: string) => string {
  const vocabulary = useContext(CareVocabularyContext);
  return useCallback((text: string) => adaptCareText(text, vocabulary), [vocabulary]);
}
