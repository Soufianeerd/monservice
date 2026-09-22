import type { FieldServiceProfessionCode } from '../professions';
import type { FieldServiceBusinessFamilyCode } from '../families';
import type { FieldServiceTerminology } from '../terminology';

export type FieldServiceWorkflowProfile =
  | 'project'
  | 'intervention'
  | 'project_and_intervention'
  | 'work_order'
  | 'repair_case'
  | 'commerce_order';

export type FieldServiceCustomerAssetModel =
  | 'none'
  | 'building_equipment'
  | 'vehicle'
  | 'device'
  | 'property'
  | 'custom_product';

export interface FieldServiceQuotingProfile {
  defaultVatRate?: number;
  usesMeasurements?: boolean;
  usesLaborBreakdown?: boolean;
  requiresDeposit?: boolean;
}

export interface FieldServiceProfessionPack {
  profession: FieldServiceProfessionCode;
  family: FieldServiceBusinessFamilyCode;
  label: string;
  shortLabel?: string;
  terminology: Readonly<FieldServiceTerminology>;
  workflowProfile: FieldServiceWorkflowProfile;
  customerAssetModel: FieldServiceCustomerAssetModel;
  quotingProfile?: FieldServiceQuotingProfile;
  dashboard?: {
    headerTitle?: string;
    quickActionNote?: string;
  };
}
