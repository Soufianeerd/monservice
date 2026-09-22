import { OrganizationContext, WorkspaceConfig } from './types';
import { GENERIC_WORKSPACE_CONFIG } from './generic/config';
import { getParamedicalWorkspaceConfig } from './paramedical/config';
import { getFieldServiceWorkspaceConfig } from './field-service/config';

export function resolveWorkspace(context?: OrganizationContext | null): WorkspaceConfig {
  if (!context) {
    return GENERIC_WORKSPACE_CONFIG;
  }

  const { sector, profession } = context;

  if (sector === 'health') {
    return getParamedicalWorkspaceConfig(profession);
  }

  if (sector === 'field_services' || sector === 'artisan') {
    return getFieldServiceWorkspaceConfig(profession);
  }

  // Fallback for other sectors (freelance, other) or empty/unknown sector
  return GENERIC_WORKSPACE_CONFIG;
}

