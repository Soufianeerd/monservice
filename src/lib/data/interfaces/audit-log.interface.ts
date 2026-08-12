export interface AuditLog {
  id: string;
  userId?: string | null;
  organizationId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: string | null;
  newValues?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
}
