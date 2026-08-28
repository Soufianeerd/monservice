import { useAuth } from '@/components/auth/AuthContext';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { WorkspaceConfig } from '@/lib/workspaces/types';

/**
 * Hook strict pour le contexte Workspace de l'organisation.
 * 
 * ⚠️ ATTENTION SÉCURITÉ :
 * Ce hook est STRICTEMENT réservé à des fins d'expérience utilisateur (UX)
 * pour adapter l'affichage de la navigation, des libellés et des menus.
 * 
 * IL NE DOIT JAMAIS ÊTRE UTILISÉ POUR CONTRÔLER L'ACCÈS AUX DONNÉES.
 * Les vérifications d'autorisation, RLS, et RBAC doivent se faire
 * de manière stricte via `requireSession`, `requireProfessional`
 * et par des politiques Supabase backend.
 * Masquer une entrée de la sidebar ne signifie pas l'interdire.
 * 
 * @returns {WorkspaceConfig | null} La configuration Workspace résolue ou null
 */
export function useWorkspace(): WorkspaceConfig | null {
  const { user, organization, isLoading } = useAuth();

  if (isLoading || !user || user.profileType === 'client') {
    return null;
  }

  // Pour un profil "professional", on résout le workspace
  return resolveWorkspace({
    sector: organization?.sector,
    profession: organization?.profession,
    country: organization?.country,
  });
}
