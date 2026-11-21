'use client';

import { createContext, useContext } from 'react';

/**
 * Indique aux écrans professionnels si les espaces clients/patients sont
 * ouverts (`CLIENT_ACCESS_ENABLED`, lu côté serveur par le layout). En V1 ils
 * sont fermés : les fonctions qui supposent un compte client sont masquées.
 * Simple confort d'affichage : les actions serveur restent gardées.
 */
const ClientAccessContext = createContext(true);

export const ClientAccessProvider = ClientAccessContext.Provider;

export function useClientAccess(): boolean {
  return useContext(ClientAccessContext);
}
