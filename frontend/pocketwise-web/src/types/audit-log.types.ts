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

export interface AuditLogSettingsResponse {
  isEnabled: boolean;
  totalLogs: number;
  oldestLogDate: string | null;
  latestLogDate: string | null;
  updatedAt: string | null;
  updatedByUserId: number | null;
}

export interface UpdateAuditLogSettingsRequest {
  isEnabled: boolean;
}

export interface PurgeAuditLogsRequest {
  olderThanDays: number;
}

export interface PurgeAuditLogsResponse {
  deletedCount: number;
  message: string;
}
