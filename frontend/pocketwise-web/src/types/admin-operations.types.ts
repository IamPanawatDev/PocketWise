export interface AdminUserListItem {
  id: number;
  email: string;
  displayName: string;
  isEmailVerified: boolean;
  isActive: boolean;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspensionReason: string | null;
  suspendedByDisplayName: string | null;
  createdAt: string;
  roles: string[];
  lastLoginAt: string | null;
}

export interface AdminUserDetail extends AdminUserListItem {
  birthDate: string | null;
  totalTransactionsCount: number;
  totalBankAccountsCount: number;
  totalCreditCardsCount: number;
  activeSessionsCount: number;
  recentSecurityEvents: SecurityEventItem[];
}

export interface AdminUserSession {
  id: number;
  deviceName: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
  isRevoked: boolean;
  isCurrent: boolean;
}

export interface SecurityEventItem {
  securityEventId: number;
  eventType: string;
  targetUserId: number | null;
  targetUserEmail: string | null;
  targetUserDisplayName: string | null;
  actorUserId: number | null;
  actorUserDisplayName: string | null;
  succeeded: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  detailsJson: string | null;
  occurredAt: string;
}

export interface AdminOverview {
  totalUsers: number;
  activeUsers30Days: number;
  suspendedUsers: number;
  unverifiedEmailUsers: number;
  signupsToday: number;
  signupsThisWeek: number;
  signupsThisMonth: number;
  importJobsSummary: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    pending: number;
  };
  securityEvents24Hours: {
    total: number;
    failedLogins: number;
    suspensions: number;
    tokenReuses: number;
  };
  maintenanceStatus: {
    isEnabled: boolean;
    message: string;
    startsAt: string | null;
    endsAt: string | null;
  };
}

export interface AdminImportJob {
  importJobId: number;
  userId: number;
  userEmail: string | null;
  userDisplayName: string | null;
  jobType: string;
  status: string;
  fileName: string;
  totalRecords: number;
  successRecords: number;
  failedRecords: number;
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AnnouncementTarget {
  announcementTargetId?: number;
  targetType: "All" | "Role" | "User" | "UnverifiedEmail";
  roleId?: number | null;
  roleName?: string | null;
  userId?: number | null;
  userEmail?: string | null;
}

export interface Announcement {
  announcementId: number;
  title: string;
  message: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdByUserId: number;
  createdByDisplayName: string | null;
  createdAt: string;
  updatedAt: string | null;
  targets: AnnouncementTarget[];
}

export interface UserActiveAnnouncement {
  announcementId: number;
  title: string;
  message: string;
  startsAt: string;
  endsAt: string;
}

export interface MaintenanceStatus {
  isEnabled: boolean;
  message: string;
  allowedUserIds: number[];
  startsAt: string | null;
  endsAt: string | null;
}

export interface SystemSettingItem {
  settingKey: string;
  settingValue: string;
  description: string | null;
  updatedAt: string;
  updatedByUserId: number | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
