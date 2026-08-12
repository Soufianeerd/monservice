export interface ProcessingActivity {
  id: string;
  organizationId: string;
  name: string;
  purpose: string;
  dataCategories?: string;
  legalBasis?: string;
  retentionPeriod?: string;
  dataSubjects?: string;
  transfers?: string;
  securityMeasures?: string;
  responsible?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BreachNotification {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  discoveryDate: Date;
  startDate?: Date;
  dataCategories?: string;
  affectedIndividuals?: number;
  riskLevel?: 'low' | 'medium' | 'high' | string;
  correctiveActions?: string;
  notifiedAuthority: boolean;
  notificationDate?: Date;
  notifiedIndividuals: boolean;
  status: 'open' | 'investigating' | 'resolved' | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentEvent {
  id: string;
  userId?: string;
  organizationId?: string;
  consentType: string;
  consentValue: boolean;
  legalBasis?: string;
  source?: string;
  ip?: string;
  userAgent?: string;
  policyVersion?: string;
  timestamp: Date;
}

export interface DataSubjectRequest {
  id: string;
  userId?: string;
  organizationId?: string;
  requestType: string;
  status: string;
  requestDetails: string;
  response?: string;
  receivedAt: Date;
  deadline?: Date;
  completedAt?: Date;
  processedBy?: string;
}
