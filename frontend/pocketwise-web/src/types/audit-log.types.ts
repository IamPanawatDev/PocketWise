export type AuditActionType = "Create" | "Update" | "Delete" | "Import";

export interface AuditLogResponse {
  auditLogId: number;
  userId: number | null;
  userDisplayName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  occurredAt: string;
  detailsJson: string | null;
}

export interface AuditLogFilter {
  action?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
  q?: string;
  userId?: number;
  page?: number;
  pageSize?: number;
}
