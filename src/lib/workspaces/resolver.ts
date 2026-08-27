import { OrganizationContext, WorkspaceConfig } from './types';
import { GENERIC_WORKSPACE_CONFIG } from './generic/config';
import { getParamedicalWorkspaceConfig } from './paramedical/config';

export function resolveWorkspace(context?: OrganizationContext | null): WorkspaceConfig {
  if (!context) {
    return GENERIC_WORKSPACE_CONFIG;
  }

  const { sector, profession } = context;

  if (sector === 'health') {
    return getParamedicalWorkspaceConfig(profession);
  }

  // Fallback for other sectors or empty sector
  return GENERIC_WORKSPACE_CONFIG;
}
