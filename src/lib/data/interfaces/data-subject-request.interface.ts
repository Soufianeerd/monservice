export interface DataSubjectRequest {
  id: string;
  userId?: string | null;
  organizationId?: string | null;
  requestType: string;
  status: string;
  requestDetails?: string | null;
  response?: string | null;
  deadline?: string | null;
  receivedAt: string;
  completedAt?: string | null;
  processedBy?: string | null;
}
