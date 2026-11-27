import { and, asc, desc, eq, gte, inArray, isNull, like, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  announcements,
  announcementTargets,
  auditLogs,
  bankAccounts,
  categories,
  creditCards,
  importJobs,
  permissions,
  rolePermissions,
  roles,
  securityEvents,
  systemSettings,
  transactions,
  userRefreshTokens,
  userRoles,
  users,
} from "@/lib/server/db/schema";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationErrorAppError,
} from "@/lib/server/api-error";
import { logAudit, type AuditAction } from "@/lib/server/audit";
import type {
  AdminImportJob,
  AdminOverview,
  AdminUserDetail,
  AdminUserListItem,
  AdminUserSession,
  Announcement,
  AnnouncementTarget,
  MaintenanceStatus,
  PagedResult,
  SecurityEventItem,
  SystemSettingItem,
  UserActiveAnnouncement,
} from "@/types/admin-operations.types";
import type {
  AuditActionType,
  AuditLogFilter,
  AuditLogResponse,
  AuditLogSettingsResponse,
  PurgeAuditLogsResponse,
} from "@/types/audit-log.types";
import type {
  CreateRoleRequest,
  PermissionResponse,
  RoleDetailResponse,
  RoleResponse,
  UpdateRoleRequest,
  UserWithRolesResponse,
} from "@/types/admin.types";
import type {
  CategoryResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../categories/category.service";

// ==========================================
// Helper: Log Security Event
// ==========================================
function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export async function logSecurityEvent(
  eventType: string,
  targetUserId: number | null,
  actorUserId: number | null,
  succeeded: boolean,
  ipAddress?: string | null,
  userAgent?: string | null,
  details?: unknown
): Promise<void> {
  try {
    const detailsJson = details ? JSON.stringify(details) : null;
    await db.insert(securityEvents).values({
      eventType,
      targetUserId,
      actorUserId,
      succeeded,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      detailsJson,
      occurredAt: new Date(),
    });
  } catch (err) {
    console.error("[SecurityEvent] Failed to record security event:", err);
  }
}

// ==========================================
// Admin Service Implementation
// ==========================================
export class AdminService {
  // ----------------------------------------------------
  // 1. USER MANAGEMENT
  // ----------------------------------------------------

  async getUsersPaged(filter: {
    q?: string;
    role?: string;
    isSuspended?: boolean;
    isEmailVerified?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<PagedResult<AdminUserListItem>> {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = clamp(filter.pageSize ?? 20, 1, 100);

    const conditions: any[] = [];

    if (filter.isSuspended !== undefined) {
      conditions.push(eq(users.isSuspended, filter.isSuspended));
    }
    if (filter.isEmailVerified !== undefined) {
      conditions.push(eq(users.isEmailVerified, filter.isEmailVerified));
    }
    if (filter.q && filter.q.trim()) {
      const search = `%${filter.q.trim().toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${users.email}) LIKE ${search}`,
          sql`LOWER(${users.displayName}) LIKE ${search}`,
          sql`LOWER(${users.userName}) LIKE ${search}`
        )
      );
    }

    if (filter.role && filter.role.trim()) {
      const normalizedRole = filter.role.trim().toUpperCase();
      const matchingRole = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.normalizedName, normalizedRole))
        .limit(1);

      if (matchingRole.length > 0) {
        const userIdsInRole = await db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(eq(userRoles.roleId, matchingRole[0].id));

        const uids = userIdsInRole.map((r) => r.userId);
        if (uids.length === 0) {
          return { items: [], page, pageSize, totalItems: 0, totalPages: 0 };
        }
        conditions.push(inArray(users.id, uids));
      } else {
        return { items: [], page, pageSize, totalItems: 0, totalPages: 0 };
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);
    const totalItems = countRes[0]?.count ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    const userRows = await db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const userIds = userRows.map((u) => u.id);
    let userRolesMap = new Map<number, string[]>();
    let lastLoginMap = new Map<number, string>();
    let suspendedByMap = new Map<number, string>();

    if (userIds.length > 0) {
      // Fetch roles
      const roleRows = await db
        .select({
          userId: userRoles.userId,
          roleName: roles.name,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(inArray(userRoles.userId, userIds));

      for (const r of roleRows) {
        const arr = userRolesMap.get(r.userId) ?? [];
        if (r.roleName) arr.push(r.roleName);
        userRolesMap.set(r.userId, arr);
      }

      // Fetch last logins from securityEvents
      const loginEvents = await db
        .select({
          targetUserId: securityEvents.targetUserId,
          occurredAt: sql<string>`max(${securityEvents.occurredAt})::text`,
        })
        .from(securityEvents)
        .where(
          and(
            inArray(securityEvents.targetUserId, userIds),
            eq(securityEvents.eventType, "LOGIN_SUCCEEDED")
          )
        )
        .groupBy(securityEvents.targetUserId);

      for (const ev of loginEvents) {
        if (ev.targetUserId) {
          lastLoginMap.set(ev.targetUserId, ev.occurredAt);
        }
      }

      // Fetch suspendedBy user names
      const suspendedByIds = userRows
        .map((u) => u.suspendedByUserId)
        .filter((id): id is number => typeof id === "number" && id > 0);
      if (suspendedByIds.length > 0) {
        const adminNames = await db
          .select({ id: users.id, displayName: users.displayName })
          .from(users)
          .where(inArray(users.id, suspendedByIds));
        for (const adm of adminNames) {
          suspendedByMap.set(adm.id, adm.displayName);
        }
      }
    }

    const items: AdminUserListItem[] = userRows.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      displayName: u.displayName,
      isEmailVerified: u.isEmailVerified,
      isActive: u.isActive,
      isSuspended: u.isSuspended,
      suspendedAt: u.suspendedAt ? u.suspendedAt.toISOString() : null,
      suspensionReason: u.suspensionReason ?? null,
      suspendedByDisplayName: u.suspendedByUserId
        ? suspendedByMap.get(u.suspendedByUserId) ?? null
        : null,
      createdAt: u.createdAt.toISOString(),
      roles: userRolesMap.get(u.id) ?? [],
      lastLoginAt: lastLoginMap.get(u.id) ?? null,
    }));

    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  async getUserDetail(userId: number): Promise<AdminUserDetail | null> {
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userRows.length === 0) return null;
    const u = userRows[0];

    // Get roles
    const roleRows = await db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    const userRoleNames = roleRows
      .map((r) => r.roleName)
      .filter((n): n is string => Boolean(n));

    // Get suspendedByDisplayName
    let suspendedByDisplayName: string | null = null;
    if (u.suspendedByUserId) {
      const adm = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, u.suspendedByUserId))
        .limit(1);
      if (adm.length > 0) suspendedByDisplayName = adm[0].displayName;
    }

    // Get lastLoginAt
    const lastLoginRes = await db
      .select({ occurredAt: securityEvents.occurredAt })
      .from(securityEvents)
      .where(
        and(
          eq(securityEvents.targetUserId, userId),
          eq(securityEvents.eventType, "LOGIN_SUCCEEDED")
        )
      )
      .orderBy(desc(securityEvents.occurredAt))
      .limit(1);
    const lastLoginAt = lastLoginRes[0]?.occurredAt
      ? lastLoginRes[0].occurredAt.toISOString()
      : null;

    // Counts
    const txCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(eq(transactions.userId, userId));
    const bankCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId));
    const cardCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(creditCards)
      .where(eq(creditCards.userId, userId));

    const now = new Date();
    const sessionCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRefreshTokens)
      .where(
        and(
          eq(userRefreshTokens.userId, userId),
          isNull(userRefreshTokens.revokedAt),
          gte(userRefreshTokens.expiresAt, now)
        )
      );

    // Recent security events (last 10)
    const secEvents = await db
      .select({
        securityEventId: securityEvents.securityEventId,
        eventType: securityEvents.eventType,
        targetUserId: securityEvents.targetUserId,
        actorUserId: securityEvents.actorUserId,
        succeeded: securityEvents.succeeded,
        ipAddress: securityEvents.ipAddress,
        userAgent: securityEvents.userAgent,
        detailsJson: securityEvents.detailsJson,
        occurredAt: securityEvents.occurredAt,
      })
      .from(securityEvents)
      .where(
        or(
          eq(securityEvents.targetUserId, userId),
          eq(securityEvents.actorUserId, userId)
        )
      )
      .orderBy(desc(securityEvents.occurredAt))
      .limit(10);

    const recentSecurityEvents: SecurityEventItem[] = secEvents.map((s) => ({
      securityEventId: s.securityEventId,
      eventType: s.eventType,
      targetUserId: s.targetUserId,
      targetUserEmail: u.email ?? null,
      targetUserDisplayName: u.displayName,
      actorUserId: s.actorUserId,
      actorUserDisplayName:
        s.actorUserId === userId
          ? u.displayName
          : s.actorUserId
          ? "Admin"
          : null,
      succeeded: s.succeeded,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      detailsJson: s.detailsJson,
      occurredAt: s.occurredAt.toISOString(),
    }));

    return {
      id: u.id,
      email: u.email ?? "",
      displayName: u.displayName,
      birthDate: u.birthDate ?? null,
      isEmailVerified: u.isEmailVerified,
      isActive: u.isActive,
      isSuspended: u.isSuspended,
      suspendedAt: u.suspendedAt ? u.suspendedAt.toISOString() : null,
      suspensionReason: u.suspensionReason ?? null,
      suspendedByDisplayName,
      createdAt: u.createdAt.toISOString(),
      roles: userRoleNames,
      lastLoginAt,
      totalTransactionsCount: txCount[0]?.count ?? 0,
      totalBankAccountsCount: bankCount[0]?.count ?? 0,
      totalCreditCardsCount: cardCount[0]?.count ?? 0,
      activeSessionsCount: sessionCount[0]?.count ?? 0,
      recentSecurityEvents,
    };
  }

  async suspendUser(
    targetUserId: number,
    actorUserId: number,
    reason: string
  ): Promise<boolean> {
    if (targetUserId === actorUserId) {
      throw new ValidationErrorAppError("ไม่สามารถระงับบัญชีของตนเองได้ (Self-suspension prohibited)");
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (existing.length === 0) return false;

    const now = new Date();
    await db
      .update(users)
      .set({
        isSuspended: true,
        suspendedAt: now,
        suspendedByUserId: actorUserId,
        suspensionReason: reason.trim(),
        updatedAt: now,
      })
      .where(eq(users.id, targetUserId));

    // Revoke all active refresh tokens immediately
    await db
      .update(userRefreshTokens)
      .set({
        revokedAt: now,
        reasonRevoked: "Revoked by admin: Account suspended",
      })
      .where(
        and(
          eq(userRefreshTokens.userId, targetUserId),
          isNull(userRefreshTokens.revokedAt)
        )
      );

    await logSecurityEvent(
      "ACCOUNT_SUSPENDED",
      targetUserId,
      actorUserId,
      true,
      null,
      null,
      { reason }
    );

    await logAudit(
      actorUserId,
      "Update",
      "Users",
      targetUserId.toString(),
      { action: "suspend", reason }
    );

    return true;
  }

  async unsuspendUser(targetUserId: number, actorUserId: number): Promise<boolean> {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (existing.length === 0) return false;

    const now = new Date();
    await db
      .update(users)
      .set({
        isSuspended: false,
        suspendedAt: null,
        suspendedByUserId: null,
        suspensionReason: null,
        updatedAt: now,
      })
      .where(eq(users.id, targetUserId));

    await logSecurityEvent(
      "ACCOUNT_UNSUSPENDED",
      targetUserId,
      actorUserId,
      true,
      null,
      null,
      { message: "Account unsuspended by admin" }
    );

    await logAudit(
      actorUserId,
      "Update",
      "Users",
      targetUserId.toString(),
      { action: "unsuspend" }
    );

    return true;
  }

  async verifyEmail(targetUserId: number, actorUserId: number): Promise<boolean> {
    const existing = await db
      .select({ id: users.id, isEmailVerified: users.isEmailVerified, email: users.email })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (existing.length === 0 || existing[0].isEmailVerified) return false;

    const now = new Date();
    await db
      .update(users)
      .set({
        isEmailVerified: true,
        emailConfirmed: true,
        updatedAt: now,
      })
      .where(eq(users.id, targetUserId));

    await logSecurityEvent(
      "USER_EMAIL_MANUALLY_VERIFIED",
      targetUserId,
      actorUserId,
      true,
      null,
      null,
      { targetEmail: existing[0].email }
    );

    await logAudit(
      actorUserId,
      "Update",
      "Users",
      targetUserId.toString(),
      { action: "verify-email", email: existing[0].email }
    );

    return true;
  }

  async resendVerificationEmail(targetUserId: number): Promise<boolean> {
    const existing = await db
      .select({ id: users.id, isEmailVerified: users.isEmailVerified, email: users.email })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (existing.length === 0 || existing[0].isEmailVerified || !existing[0].email) {
      return false;
    }
    // Simulation / safe logging (in production this uses SMTP/Resend API)
    console.log(`[Admin] Sent verification email link to ${existing[0].email}`);
    return true;
  }

  async sendPasswordResetLink(targetUserId: number): Promise<string | null> {
    const existing = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (existing.length === 0 || !existing[0].email) return null;

    const rawToken = `reset_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    console.log(`[Admin] Generated password reset link for ${existing[0].email}: ${rawToken}`);
    return rawToken;
  }

  async getUserSessions(userId: number): Promise<AdminUserSession[]> {
    const sessions = await db
      .select()
      .from(userRefreshTokens)
      .where(eq(userRefreshTokens.userId, userId))
      .orderBy(desc(userRefreshTokens.createdAt));

    const now = new Date();
    return sessions.map((s) => ({
      id: s.refreshTokenId,
      deviceName: s.userAgent ?? "Unknown Device",
      ipAddress: s.createdByIp ?? null,
      lastUsedAt: s.createdAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isRevoked: Boolean(s.revokedAt) || s.expiresAt <= now,
      isCurrent: false,
    }));
  }

  async revokeSession(userId: number, tokenId: number, adminUserId: number): Promise<boolean> {
    const token = await db
      .select()
      .from(userRefreshTokens)
      .where(
        and(
          eq(userRefreshTokens.refreshTokenId, tokenId),
          eq(userRefreshTokens.userId, userId)
        )
      )
      .limit(1);
    if (token.length === 0) return false;

    await db
      .update(userRefreshTokens)
      .set({
        revokedAt: new Date(),
        revokedByIp: "admin",
        reasonRevoked: "Revoked by admin",
      })
      .where(eq(userRefreshTokens.refreshTokenId, tokenId));

    await logSecurityEvent(
      "SESSION_REVOKED_BY_ADMIN",
      userId,
      adminUserId,
      true,
      null,
      null,
      { tokenId }
    );

    return true;
  }

  async revokeAllSessions(userId: number, adminUserId: number): Promise<number> {
    const now = new Date();
    const updated = await db
      .update(userRefreshTokens)
      .set({
        revokedAt: now,
        revokedByIp: "admin",
        reasonRevoked: "All sessions revoked by admin",
      })
      .where(
        and(
          eq(userRefreshTokens.userId, userId),
          isNull(userRefreshTokens.revokedAt)
        )
      )
      .returning({ id: userRefreshTokens.refreshTokenId });

    await logSecurityEvent(
      "ALL_SESSIONS_REVOKED_BY_ADMIN",
      userId,
      adminUserId,
      true,
      null,
      null,
      { revokedCount: updated.length }
    );

    return updated.length;
  }

  async assignUserRoles(
    targetUserId: number,
    actorUserId: number,
    roleNames: string[]
  ): Promise<UserWithRolesResponse | null> {
    const userRes = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (userRes.length === 0) return null;
    const targetUser = userRes[0];

    // Self-demotion protection: If admin modifies own roles, cannot drop Admin role
    if (targetUserId === actorUserId) {
      const hasAdmin = roleNames.some(
        (r) => r.toLowerCase() === "admin" || r.toLowerCase() === "superadmin"
      );
      if (!hasAdmin) {
        throw new ValidationErrorAppError(
          "ไม่สามารถเพิกถอนบทบาท Admin ของตนเองได้ (Self-demotion prohibited)"
        );
      }
    }

    // Resolve roles
    const allRoles = await db.select().from(roles);
    const targetRoleIds: number[] = [];

    for (const name of roleNames) {
      const match = allRoles.find(
        (r) => r.name?.toLowerCase() === name.trim().toLowerCase()
      );
      if (match) {
        targetRoleIds.push(match.id);
      }
    }

    // Delete existing roles
    await db.delete(userRoles).where(eq(userRoles.userId, targetUserId));

    // Insert new roles
    for (const roleId of targetRoleIds) {
      await db.insert(userRoles).values({
        userId: targetUserId,
        roleId,
        assignedAt: new Date(),
      });
    }

    await logAudit(
      actorUserId,
      "Update",
      "UserRoles",
      targetUserId.toString(),
      { targetUserId, assignedRoles: roleNames }
    );

    await logSecurityEvent(
      "USER_ROLES_ASSIGNED",
      targetUserId,
      actorUserId,
      true,
      null,
      null,
      { roleNames }
    );

    return {
      userId: targetUser.id,
      email: targetUser.email ?? "",
      displayName: targetUser.displayName,
      isActive: targetUser.isActive,
      roles: roleNames,
      createdAt: targetUser.createdAt.toISOString(),
    };
  }

  // ----------------------------------------------------
  // 2. SECURITY EVENTS
  // ----------------------------------------------------

  async getSecurityEventsPaged(filter: {
    eventType?: string;
    targetUserId?: number;
    actorUserId?: number;
    succeeded?: boolean;
    fromDate?: string;
    toDate?: string;
    q?: string;
    maskIp?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<PagedResult<SecurityEventItem>> {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = clamp(filter.pageSize ?? 20, 1, 100);

    const conditions: any[] = [];

    if (filter.eventType && filter.eventType.trim()) {
      conditions.push(eq(securityEvents.eventType, filter.eventType.trim()));
    }
    if (filter.targetUserId) {
      conditions.push(eq(securityEvents.targetUserId, filter.targetUserId));
    }
    if (filter.actorUserId) {
      conditions.push(eq(securityEvents.actorUserId, filter.actorUserId));
    }
    if (filter.succeeded !== undefined) {
      conditions.push(eq(securityEvents.succeeded, filter.succeeded));
    }
    if (filter.fromDate) {
      conditions.push(gte(securityEvents.occurredAt, new Date(filter.fromDate)));
    }
    if (filter.toDate) {
      conditions.push(lte(securityEvents.occurredAt, new Date(filter.toDate)));
    }
    if (filter.q && filter.q.trim()) {
      const search = `%${filter.q.trim().toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${securityEvents.eventType}) LIKE ${search}`,
          sql`LOWER(${securityEvents.ipAddress}) LIKE ${search}`,
          sql`LOWER(${securityEvents.userAgent}) LIKE ${search}`,
          sql`LOWER(${securityEvents.detailsJson}) LIKE ${search}`
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(securityEvents)
      .where(whereClause);
    const totalItems = countRes[0]?.count ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    const rows = await db
      .select()
      .from(securityEvents)
      .where(whereClause)
      .orderBy(desc(securityEvents.occurredAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Get user names for target and actor
    const allUserIds = new Set<number>();
    for (const r of rows) {
      if (r.targetUserId) allUserIds.add(r.targetUserId);
      if (r.actorUserId) allUserIds.add(r.actorUserId);
    }

    const userMap = new Map<number, { displayName: string; email: string }>();
    if (allUserIds.size > 0) {
      const urows = await db
        .select({ id: users.id, displayName: users.displayName, email: users.email })
        .from(users)
        .where(inArray(users.id, Array.from(allUserIds)));
      for (const u of urows) {
        userMap.set(u.id, { displayName: u.displayName, email: u.email ?? "" });
      }
    }

    const items: SecurityEventItem[] = rows.map((r) => {
      let ip = r.ipAddress;
      if (filter.maskIp && ip) {
        const parts = ip.split(".");
        if (parts.length === 4) {
          ip = `${parts[0]}.${parts[1]}.*.*`;
        }
      }

      const target = r.targetUserId ? userMap.get(r.targetUserId) : null;
      const actor = r.actorUserId ? userMap.get(r.actorUserId) : null;

      return {
        securityEventId: r.securityEventId,
        eventType: r.eventType,
        targetUserId: r.targetUserId,
        targetUserEmail: target?.email ?? null,
        targetUserDisplayName: target?.displayName ?? null,
        actorUserId: r.actorUserId,
        actorUserDisplayName: actor?.displayName ?? null,
        succeeded: r.succeeded,
        ipAddress: ip,
        userAgent: r.userAgent,
        detailsJson: r.detailsJson,
        occurredAt: r.occurredAt.toISOString(),
      };
    });

    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  // ----------------------------------------------------
  // 3. AUDIT LOGS
  // ----------------------------------------------------

  async getAuditLogsPaged(
    filter: AuditLogFilter,
    currentUserId: number,
    isAdmin: boolean
  ): Promise<PagedResult<AuditLogResponse>> {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = clamp(filter.pageSize ?? 20, 1, 100);

    const conditions: any[] = [];

    if (!isAdmin) {
      conditions.push(eq(auditLogs.userId, currentUserId));
    } else if (filter.userId) {
      conditions.push(eq(auditLogs.userId, filter.userId));
    }

    if (filter.action && filter.action.trim()) {
      conditions.push(eq(auditLogs.action, filter.action.trim()));
    }
    if (filter.entityType && filter.entityType.trim()) {
      conditions.push(eq(auditLogs.entityType, filter.entityType.trim()));
    }
    if (filter.entityId && filter.entityId.trim()) {
      conditions.push(eq(auditLogs.entityId, filter.entityId.trim()));
    }
    if (filter.fromDate) {
      conditions.push(gte(auditLogs.occurredAt, new Date(filter.fromDate)));
    }
    if (filter.toDate) {
      conditions.push(lte(auditLogs.occurredAt, new Date(filter.toDate)));
    }
    if (filter.q && filter.q.trim()) {
      const search = `%${filter.q.trim().toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${auditLogs.action}) LIKE ${search}`,
          sql`LOWER(${auditLogs.entityType}) LIKE ${search}`,
          sql`LOWER(${auditLogs.entityId}) LIKE ${search}`,
          sql`LOWER(${auditLogs.detailsJson}) LIKE ${search}`
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause);
    const totalItems = countRes[0]?.count ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.occurredAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const uids = rows
      .map((r) => r.userId)
      .filter((id): id is number => typeof id === "number" && id > 0);
    const nameMap = new Map<number, string>();
    if (uids.length > 0) {
      const userList = await db
        .select({ id: users.id, displayName: users.displayName })
        .from(users)
        .where(inArray(users.id, Array.from(new Set(uids))));
      for (const u of userList) {
        nameMap.set(u.id, u.displayName);
      }
    }

    const items: AuditLogResponse[] = rows.map((r) => ({
      auditLogId: r.auditLogId,
      userId: r.userId,
      userDisplayName: r.userId ? nameMap.get(r.userId) ?? null : null,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      occurredAt: r.occurredAt.toISOString(),
      detailsJson: r.detailsJson,
    }));

    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  async getAuditLogById(
    id: number,
    currentUserId: number,
    isAdmin: boolean
  ): Promise<AuditLogResponse | null> {
    const row = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.auditLogId, id))
      .limit(1);
    if (row.length === 0) return null;
    const r = row[0];

    if (!isAdmin && r.userId !== currentUserId) {
      throw new ForbiddenError("คุณไม่มีสิทธิ์ในการดูประวัติ Audit Log นี้");
    }

    let userDisplayName: string | null = null;
    if (r.userId) {
      const u = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, r.userId))
        .limit(1);
      if (u.length > 0) userDisplayName = u[0].displayName;
    }

    return {
      auditLogId: r.auditLogId,
      userId: r.userId,
      userDisplayName,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      occurredAt: r.occurredAt.toISOString(),
      detailsJson: r.detailsJson,
    };
  }

  async getEntityTypes(currentUserId: number, isAdmin: boolean): Promise<string[]> {
    const conditions = !isAdmin ? [eq(auditLogs.userId, currentUserId)] : [];
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .selectDistinct({ entityType: auditLogs.entityType })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(asc(auditLogs.entityType));

    return rows.map((r) => r.entityType);
  }

  async getAuditLogSettings(): Promise<AuditLogSettingsResponse> {
    const settingRes = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, "AuditLogs:Enabled"))
      .limit(1);

    const isEnabled = settingRes.length > 0 ? settingRes[0].settingValue === "true" : true;
    const countRes = await db
      .select({
        count: sql<number>`count(*)::int`,
        oldest: sql<string>`min(${auditLogs.occurredAt})::text`,
        latest: sql<string>`max(${auditLogs.occurredAt})::text`,
      })
      .from(auditLogs);

    return {
      isEnabled,
      totalLogs: countRes[0]?.count ?? 0,
      oldestLogDate: countRes[0]?.oldest ?? null,
      latestLogDate: countRes[0]?.latest ?? null,
      updatedAt: settingRes[0]?.updatedAt ? settingRes[0].updatedAt.toISOString() : null,
      updatedByUserId: settingRes[0]?.updatedByUserId ?? null,
    };
  }

  async updateAuditLogSettings(
    isEnabled: boolean,
    adminUserId: number
  ): Promise<void> {
    const now = new Date();
    const existing = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, "AuditLogs:Enabled"))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(systemSettings).values({
        settingKey: "AuditLogs:Enabled",
        settingValue: isEnabled ? "true" : "false",
        description: "เปิด/ปิด การบันทึก Audit Logs",
        updatedAt: now,
        updatedByUserId: adminUserId,
      });
    } else {
      await db
        .update(systemSettings)
        .set({
          settingValue: isEnabled ? "true" : "false",
          updatedAt: now,
          updatedByUserId: adminUserId,
        })
        .where(eq(systemSettings.settingKey, "AuditLogs:Enabled"));
    }

    await logSecurityEvent(
      "AUDIT_LOG_SETTINGS_UPDATED",
      null,
      adminUserId,
      true,
      null,
      null,
      { isEnabled }
    );
  }

  async purgeAuditLogs(olderThanDays: number, adminUserId: number): Promise<PurgeAuditLogsResponse> {
    const days = Math.max(1, olderThanDays);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const deleted = await db
      .delete(auditLogs)
      .where(lte(auditLogs.occurredAt, cutoff))
      .returning({ id: auditLogs.auditLogId });

    await logSecurityEvent(
      "AUDIT_LOGS_PURGED",
      null,
      adminUserId,
      true,
      null,
      null,
      { olderThanDays: days, deletedCount: deleted.length }
    );

    return {
      deletedCount: deleted.length,
      message: `ลบ Audit Logs ที่เก่ากว่า ${days} วัน เรียบร้อยแล้ว (${deleted.length} รายการ)`,
    };
  }

  // ----------------------------------------------------
  // 4. OVERVIEW, SYSTEM SETTINGS & MAINTENANCE
  // ----------------------------------------------------

  async getOverview(): Promise<AdminOverview> {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const dayOfWeek = todayStart.getUTCDay();
    const weekStart = new Date(todayStart.getTime() - dayOfWeek * 86400000);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600000);

    const totalUsersRes = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const suspendedRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.isSuspended, true));
    const unverifiedRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.isEmailVerified, false));

    const signupsTodayRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(gte(users.createdAt, todayStart));
    const signupsWeekRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(gte(users.createdAt, weekStart));
    const signupsMonthRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(gte(users.createdAt, monthStart));

    // Active users in 30 days
    const activeRes = await db
      .select({ count: sql<number>`count(distinct ${securityEvents.targetUserId})::int` })
      .from(securityEvents)
      .where(
        and(
          gte(securityEvents.occurredAt, thirtyDaysAgo),
          eq(securityEvents.eventType, "LOGIN_SUCCEEDED")
        )
      );

    let activeUsers30Days = activeRes[0]?.count ?? 0;
    if (activeUsers30Days === 0 && (totalUsersRes[0]?.count ?? 0) > 0) {
      const fallbackActive = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.isActive, true), eq(users.isSuspended, false)));
      activeUsers30Days = fallbackActive[0]?.count ?? 0;
    }

    // Import jobs summary
    const importStats = await db
      .select({
        status: importJobs.status,
        count: sql<number>`count(*)::int`,
      })
      .from(importJobs)
      .groupBy(importJobs.status);

    let totalImports = 0;
    let completedImports = 0;
    let failedImports = 0;
    let processingImports = 0;
    let pendingImports = 0;

    for (const stat of importStats) {
      totalImports += stat.count;
      const s = stat.status.toLowerCase();
      if (s === "completed") completedImports += stat.count;
      else if (s === "failed") failedImports += stat.count;
      else if (s === "processing") processingImports += stat.count;
      else if (s === "pending") pendingImports += stat.count;
    }

    // Security events in 24 hours
    const secStats = await db
      .select({
        eventType: securityEvents.eventType,
        count: sql<number>`count(*)::int`,
      })
      .from(securityEvents)
      .where(gte(securityEvents.occurredAt, twentyFourHoursAgo))
      .groupBy(securityEvents.eventType);

    let secTotal = 0;
    let failedLogins = 0;
    let suspensions = 0;
    let tokenReuses = 0;

    for (const s of secStats) {
      secTotal += s.count;
      if (s.eventType === "LOGIN_FAILED") failedLogins += s.count;
      else if (s.eventType === "ACCOUNT_SUSPENDED") suspensions += s.count;
      else if (s.eventType === "TOKEN_REUSE") tokenReuses += s.count;
    }

    const maintenance = await this.getMaintenanceStatus();

    return {
      totalUsers: totalUsersRes[0]?.count ?? 0,
      activeUsers30Days,
      suspendedUsers: suspendedRes[0]?.count ?? 0,
      unverifiedEmailUsers: unverifiedRes[0]?.count ?? 0,
      signupsToday: signupsTodayRes[0]?.count ?? 0,
      signupsThisWeek: signupsWeekRes[0]?.count ?? 0,
      signupsThisMonth: signupsMonthRes[0]?.count ?? 0,
      importJobsSummary: {
        total: totalImports,
        completed: completedImports,
        failed: failedImports,
        processing: processingImports,
        pending: pendingImports,
      },
      securityEvents24Hours: {
        total: secTotal,
        failedLogins,
        suspensions,
        tokenReuses,
      },
      maintenanceStatus: {
        isEnabled: maintenance.isEnabled,
        message: maintenance.message,
        startsAt: maintenance.startsAt,
        endsAt: maintenance.endsAt,
      },
    };
  }

  async getAllSettings(): Promise<SystemSettingItem[]> {
    const rows = await db
      .select()
      .from(systemSettings)
      .orderBy(asc(systemSettings.settingKey));

    return rows.map((r) => ({
      settingKey: r.settingKey,
      settingValue: r.settingValue,
      description: r.description ?? null,
      updatedAt: r.updatedAt.toISOString(),
      updatedByUserId: r.updatedByUserId ?? null,
    }));
  }

  async updateSetting(
    key: string,
    value: string,
    adminUserId: number
  ): Promise<SystemSettingItem> {
    const now = new Date();
    const existing = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, key))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(systemSettings).values({
        settingKey: key,
        settingValue: value,
        updatedAt: now,
        updatedByUserId: adminUserId,
      });
    } else {
      await db
        .update(systemSettings)
        .set({
          settingValue: value,
          updatedAt: now,
          updatedByUserId: adminUserId,
        })
        .where(eq(systemSettings.settingKey, key));
    }

    await logSecurityEvent(
      "SYSTEM_SETTING_UPDATED",
      null,
      adminUserId,
      true,
      null,
      null,
      { key, value }
    );

    const updated = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, key))
      .limit(1);
    const r = updated[0];

    return {
      settingKey: r.settingKey,
      settingValue: r.settingValue,
      description: r.description ?? null,
      updatedAt: r.updatedAt.toISOString(),
      updatedByUserId: r.updatedByUserId ?? null,
    };
  }

  async getMaintenanceStatus(): Promise<MaintenanceStatus> {
    const rows = await db
      .select()
      .from(systemSettings)
      .where(like(systemSettings.settingKey, "Maintenance:%"));

    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.settingKey, r.settingValue);
    }

    const isEnabled = map.get("Maintenance:Enabled") === "true";
    const message =
      map.get("Maintenance:Message") ||
      "ระบบกำลังอยู่ระหว่างปรับปรุงประสิทธิภาพ กรุณากลับมาใหม่อีกครั้งในภายหลัง";
    const allowedStr = map.get("Maintenance:AllowedUserIds") || "";
    const allowedUserIds = allowedStr
      ? allowedStr
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n) && n > 0)
      : [];
    const startsAt = map.get("Maintenance:StartsAt") || null;
    const endsAt = map.get("Maintenance:EndsAt") || null;

    return {
      isEnabled,
      message,
      allowedUserIds,
      startsAt,
      endsAt,
    };
  }

  async updateMaintenanceStatus(
    adminUserId: number,
    req: {
      isEnabled: boolean;
      message?: string;
      allowedUserIds?: number[];
      startsAt?: string | null;
      endsAt?: string | null;
    }
  ): Promise<MaintenanceStatus> {
    const upsertSetting = async (key: string, val: string, descText: string) => {
      const now = new Date();
      const existing = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, key))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(systemSettings).values({
          settingKey: key,
          settingValue: val,
          description: descText,
          updatedAt: now,
          updatedByUserId: adminUserId,
        });
      } else {
        await db
          .update(systemSettings)
          .set({
            settingValue: val,
            updatedAt: now,
            updatedByUserId: adminUserId,
          })
          .where(eq(systemSettings.settingKey, key));
      }
    };

    await upsertSetting(
      "Maintenance:Enabled",
      req.isEnabled ? "true" : "false",
      "เปิด/ปิด โหมดปรับปรุงระบบ (Maintenance Mode)"
    );
    if (req.message) {
      await upsertSetting(
        "Maintenance:Message",
        req.message.trim(),
        "ข้อความแจ้งเตือนผู้ใช้งานเมื่ออยู่ในโหมดปรับปรุงระบบ"
      );
    }
    const allowedStr = req.allowedUserIds ? req.allowedUserIds.join(",") : "";
    await upsertSetting(
      "Maintenance:AllowedUserIds",
      allowedStr,
      "รหัสผู้ใช้ที่ได้รับอนุญาตให้เข้าใช้งานได้ระหว่างปรับปรุงระบบ"
    );
    await upsertSetting(
      "Maintenance:StartsAt",
      req.startsAt ?? "",
      "เวลาเริ่มต้นการปรับปรุงระบบ"
    );
    await upsertSetting(
      "Maintenance:EndsAt",
      req.endsAt ?? "",
      "เวลาสิ้นสุดการปรับปรุงระบบโดยประมาณ"
    );

    await logSecurityEvent(
      "MAINTENANCE_MODE_UPDATED",
      null,
      adminUserId,
      true,
      null,
      null,
      req
    );

    return this.getMaintenanceStatus();
  }

  // ----------------------------------------------------
  // 5. ANNOUNCEMENTS
  // ----------------------------------------------------

  async getAllAnnouncements(): Promise<Announcement[]> {
    const list = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));

    const creatorIds = list.map((a) => a.createdByUserId);
    const creatorMap = new Map<number, string>();
    if (creatorIds.length > 0) {
      const urows = await db
        .select({ id: users.id, displayName: users.displayName })
        .from(users)
        .where(inArray(users.id, Array.from(new Set(creatorIds))));
      for (const u of urows) creatorMap.set(u.id, u.displayName);
    }

    const allTargets = await db.select().from(announcementTargets);
    const targetMap = new Map<number, AnnouncementTarget[]>();

    // Load roles and users for targets
    const roleIds = allTargets
      .map((t) => t.roleId)
      .filter((id): id is number => typeof id === "number" && id > 0);
    const targetUserIds = allTargets
      .map((t) => t.userId)
      .filter((id): id is number => typeof id === "number" && id > 0);

    const roleNameMap = new Map<number, string>();
    if (roleIds.length > 0) {
      const rrows = await db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(inArray(roles.id, Array.from(new Set(roleIds))));
      for (const r of rrows) {
        if (r.name) roleNameMap.set(r.id, r.name);
      }
    }

    const userEmailMap = new Map<number, string>();
    if (targetUserIds.length > 0) {
      const urows = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(inArray(users.id, Array.from(new Set(targetUserIds))));
      for (const u of urows) {
        if (u.email) userEmailMap.set(u.id, u.email);
      }
    }

    for (const t of allTargets) {
      const arr = targetMap.get(t.announcementId) ?? [];
      arr.push({
        announcementTargetId: t.announcementTargetId,
        targetType: t.targetType as any,
        roleId: t.roleId,
        roleName: t.roleId ? roleNameMap.get(t.roleId) ?? null : null,
        userId: t.userId,
        userEmail: t.userId ? userEmailMap.get(t.userId) ?? null : null,
      });
      targetMap.set(t.announcementId, arr);
    }

    return list.map((a) => ({
      announcementId: a.announcementId,
      title: a.title,
      message: a.message,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      isActive: a.isActive,
      createdByUserId: a.createdByUserId,
      createdByDisplayName: creatorMap.get(a.createdByUserId) ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt ? a.updatedAt.toISOString() : null,
      targets: targetMap.get(a.announcementId) ?? [],
    }));
  }

  async getAnnouncementById(id: number): Promise<Announcement | null> {
    const rows = await db
      .select()
      .from(announcements)
      .where(eq(announcements.announcementId, id))
      .limit(1);
    if (rows.length === 0) return null;
    const a = rows[0];

    let createdByDisplayName: string | null = null;
    const creator = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, a.createdByUserId))
      .limit(1);
    if (creator.length > 0) createdByDisplayName = creator[0].displayName;

    const targets = await db
      .select()
      .from(announcementTargets)
      .where(eq(announcementTargets.announcementId, id));

    const roleIds = targets
      .map((t) => t.roleId)
      .filter((rid): rid is number => typeof rid === "number" && rid > 0);
    const uids = targets
      .map((t) => t.userId)
      .filter((uid): uid is number => typeof uid === "number" && uid > 0);

    const roleNameMap = new Map<number, string>();
    if (roleIds.length > 0) {
      const rrows = await db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(inArray(roles.id, roleIds));
      for (const r of rrows) if (r.name) roleNameMap.set(r.id, r.name);
    }

    const userEmailMap = new Map<number, string>();
    if (uids.length > 0) {
      const urows = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(inArray(users.id, uids));
      for (const u of urows) if (u.email) userEmailMap.set(u.id, u.email);
    }

    const targetList: AnnouncementTarget[] = targets.map((t) => ({
      announcementTargetId: t.announcementTargetId,
      targetType: t.targetType as any,
      roleId: t.roleId,
      roleName: t.roleId ? roleNameMap.get(t.roleId) ?? null : null,
      userId: t.userId,
      userEmail: t.userId ? userEmailMap.get(t.userId) ?? null : null,
    }));

    return {
      announcementId: a.announcementId,
      title: a.title,
      message: a.message,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      isActive: a.isActive,
      createdByUserId: a.createdByUserId,
      createdByDisplayName,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt ? a.updatedAt.toISOString() : null,
      targets: targetList,
    };
  }

  async createAnnouncement(
    adminUserId: number,
    req: {
      title: string;
      message: string;
      startsAt: string;
      endsAt: string;
      isActive: boolean;
      targets: AnnouncementTarget[];
    }
  ): Promise<Announcement> {
    if (!req.title?.trim() || !req.message?.trim()) {
      throw new ValidationErrorAppError("กรุณากรอกหัวข้อและเนื้อหาประกาศ");
    }

    const starts = new Date(req.startsAt);
    const ends = new Date(req.endsAt);
    if (ends <= starts) {
      throw new ValidationErrorAppError("เวลาสิ้นสุดประกาศต้องมากกว่าเวลาเริ่มต้น");
    }

    const inserted = await db
      .insert(announcements)
      .values({
        title: req.title.trim(),
        message: req.message.trim(),
        startsAt: starts,
        endsAt: ends,
        isActive: req.isActive,
        createdByUserId: adminUserId,
        createdAt: new Date(),
      })
      .returning({ id: announcements.announcementId });

    const newId = inserted[0].id;

    if (req.targets && req.targets.length > 0) {
      for (const t of req.targets) {
        await db.insert(announcementTargets).values({
          announcementId: newId,
          targetType: t.targetType,
          roleId: t.roleId ?? null,
          userId: t.userId ?? null,
          createdAt: new Date(),
        });
      }
    }

    await logAudit(
      adminUserId,
      "Create",
      "Announcements",
      newId.toString(),
      { title: req.title }
    );

    return (await this.getAnnouncementById(newId))!;
  }

  async updateAnnouncement(
    id: number,
    adminUserId: number,
    req: {
      title: string;
      message: string;
      startsAt: string;
      endsAt: string;
      isActive: boolean;
      targets: AnnouncementTarget[];
    }
  ): Promise<Announcement | null> {
    const existing = await this.getAnnouncementById(id);
    if (!existing) return null;

    if (!req.title?.trim() || !req.message?.trim()) {
      throw new ValidationErrorAppError("กรุณากรอกหัวข้อและเนื้อหาประกาศ");
    }

    const starts = new Date(req.startsAt);
    const ends = new Date(req.endsAt);
    if (ends <= starts) {
      throw new ValidationErrorAppError("เวลาสิ้นสุดประกาศต้องมากกว่าเวลาเริ่มต้น");
    }

    await db
      .update(announcements)
      .set({
        title: req.title.trim(),
        message: req.message.trim(),
        startsAt: starts,
        endsAt: ends,
        isActive: req.isActive,
        updatedAt: new Date(),
      })
      .where(eq(announcements.announcementId, id));

    // Replace targets
    await db
      .delete(announcementTargets)
      .where(eq(announcementTargets.announcementId, id));

    if (req.targets && req.targets.length > 0) {
      for (const t of req.targets) {
        await db.insert(announcementTargets).values({
          announcementId: id,
          targetType: t.targetType,
          roleId: t.roleId ?? null,
          userId: t.userId ?? null,
          createdAt: new Date(),
        });
      }
    }

    await logAudit(
      adminUserId,
      "Update",
      "Announcements",
      id.toString(),
      { title: req.title }
    );

    return this.getAnnouncementById(id);
  }

  async deleteAnnouncement(id: number, adminUserId: number): Promise<boolean> {
    const existing = await db
      .select()
      .from(announcements)
      .where(eq(announcements.announcementId, id))
      .limit(1);
    if (existing.length === 0) return false;

    await db
      .delete(announcementTargets)
      .where(eq(announcementTargets.announcementId, id));
    await db
      .delete(announcements)
      .where(eq(announcements.announcementId, id));

    await logAudit(
      adminUserId,
      "Delete",
      "Announcements",
      id.toString(),
      { title: existing[0].title }
    );

    return true;
  }

  async getActiveAnnouncementsForUser(
    userId?: number
  ): Promise<UserActiveAnnouncement[]> {
    const now = new Date();

    const activeList = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          lte(announcements.startsAt, now),
          gte(announcements.endsAt, now)
        )
      )
      .orderBy(desc(announcements.createdAt));

    if (activeList.length === 0) return [];

    const activeIds = activeList.map((a) => a.announcementId);
    const targetRows = await db
      .select()
      .from(announcementTargets)
      .where(inArray(announcementTargets.announcementId, activeIds));

    const targetMap = new Map<number, typeof targetRows>();
    for (const t of targetRows) {
      const arr = targetMap.get(t.announcementId) ?? [];
      arr.push(t);
      targetMap.set(t.announcementId, arr);
    }

    if (!userId) {
      // Anonymous
      return activeList
        .filter((a) => {
          const t = targetMap.get(a.announcementId) ?? [];
          return t.length === 0 || t.some((x) => x.targetType === "All");
        })
        .map((a) => ({
          announcementId: a.announcementId,
          title: a.title,
          message: a.message,
          startsAt: a.startsAt.toISOString(),
          endsAt: a.endsAt.toISOString(),
        }));
    }

    // Authenticated user
    const userRes = await db
      .select({ isEmailVerified: users.isEmailVerified })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const isEmailVerified = userRes[0]?.isEmailVerified ?? false;

    const userRoleList = await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    const roleIdSet = new Set(userRoleList.map((r) => r.roleId));

    const matched = activeList.filter((a) => {
      const t = targetMap.get(a.announcementId) ?? [];
      if (t.length === 0) return true;

      return t.some(
        (target) =>
          target.targetType === "All" ||
          (target.targetType === "Role" && target.roleId && roleIdSet.has(target.roleId)) ||
          (target.targetType === "User" && target.userId === userId) ||
          (target.targetType === "UnverifiedEmail" && !isEmailVerified)
      );
    });

    return matched.map((a) => ({
      announcementId: a.announcementId,
      title: a.title,
      message: a.message,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
    }));
  }

  // ----------------------------------------------------
  // 6. ROLES & PERMISSIONS
  // ----------------------------------------------------

  async getRoles(): Promise<RoleResponse[]> {
    const roleList = await db.select().from(roles).orderBy(asc(roles.id));

    const userCountRows = await db
      .select({
        roleId: userRoles.roleId,
        count: sql<number>`count(*)::int`,
      })
      .from(userRoles)
      .groupBy(userRoles.roleId);
    const userCountMap = new Map<number, number>();
    for (const u of userCountRows) userCountMap.set(u.roleId, u.count);

    const permCountRows = await db
      .select({
        roleId: rolePermissions.roleId,
        count: sql<number>`count(*)::int`,
      })
      .from(rolePermissions)
      .groupBy(rolePermissions.roleId);
    const permCountMap = new Map<number, number>();
    for (const p of permCountRows) permCountMap.set(p.roleId, p.count);

    return roleList.map((r) => ({
      id: r.id,
      name: r.name ?? "",
      description: r.description ?? null,
      isActive: r.isActive,
      userCount: userCountMap.get(r.id) ?? 0,
      permissionCount: permCountMap.get(r.id) ?? 0,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getRoleById(roleId: number): Promise<RoleDetailResponse | null> {
    const roleRes = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    if (roleRes.length === 0) return null;
    const r = roleRes[0];

    const perms = await db
      .select({
        permissionId: permissions.permissionId,
        permissionCode: permissions.permissionCode,
        permissionName: permissions.permissionName,
        module: permissions.module,
        description: permissions.description,
      })
      .from(rolePermissions)
      .innerJoin(
        permissions,
        eq(rolePermissions.permissionId, permissions.permissionId)
      )
      .where(eq(rolePermissions.roleId, roleId))
      .orderBy(asc(permissions.module), asc(permissions.permissionId));

    return {
      id: r.id,
      name: r.name ?? "",
      description: r.description ?? null,
      isActive: r.isActive,
      permissions: perms.map((p) => ({
        permissionId: p.permissionId,
        permissionCode: p.permissionCode,
        permissionName: p.permissionName,
        module: p.module,
        description: p.description ?? null,
      })),
      createdAt: r.createdAt.toISOString(),
    };
  }

  async createRole(
    actorUserId: number,
    req: CreateRoleRequest
  ): Promise<RoleDetailResponse> {
    const roleName = req.name?.trim();
    if (!roleName) {
      throw new ValidationErrorAppError("ชื่อบทบาทต้องไม่เป็นค่าว่าง");
    }

    const existing = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.normalizedName, roleName.toUpperCase()))
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictError(`บทบาทชื่อ '${roleName}' มีอยู่ในระบบแล้ว`);
    }

    const now = new Date();
    const inserted = await db
      .insert(roles)
      .values({
        name: roleName,
        normalizedName: roleName.toUpperCase(),
        description: req.description?.trim() ?? null,
        isActive: true,
        createdAt: now,
      })
      .returning({ id: roles.id });
    const newRoleId = inserted[0].id;

    if (req.permissionIds && req.permissionIds.length > 0) {
      for (const pid of req.permissionIds) {
        await db.insert(rolePermissions).values({
          roleId: newRoleId,
          permissionId: pid,
          createdAt: now,
        });
      }
    }

    await logAudit(
      actorUserId,
      "Create",
      "Roles",
      newRoleId.toString(),
      { name: roleName, description: req.description, permissionIds: req.permissionIds }
    );

    return (await this.getRoleById(newRoleId))!;
  }

  async updateRole(
    roleId: number,
    actorUserId: number,
    req: UpdateRoleRequest
  ): Promise<RoleDetailResponse | null> {
    const roleRes = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    if (roleRes.length === 0) return null;

    const roleName = req.name?.trim();
    if (!roleName) {
      throw new ValidationErrorAppError("ชื่อบทบาทต้องไม่เป็นค่าว่าง");
    }

    const conflict = await db
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(
          eq(roles.normalizedName, roleName.toUpperCase()),
          ne(roles.id, roleId)
        )
      )
      .limit(1);
    if (conflict.length > 0) {
      throw new ConflictError(`บทบาทชื่อ '${roleName}' มีอยู่ในระบบแล้ว`);
    }

    const now = new Date();
    await db
      .update(roles)
      .set({
        name: roleName,
        normalizedName: roleName.toUpperCase(),
        description: req.description?.trim() ?? null,
        isActive: req.isActive,
        updatedAt: now,
      })
      .where(eq(roles.id, roleId));

    await logAudit(
      actorUserId,
      "Update",
      "Roles",
      roleId.toString(),
      { name: roleName, description: req.description, isActive: req.isActive }
    );

    return this.getRoleById(roleId);
  }

  async deleteRole(roleId: number, actorUserId: number): Promise<boolean> {
    const roleRes = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    if (roleRes.length === 0) return false;
    const r = roleRes[0];

    const norm = r.normalizedName?.toUpperCase();
    if (norm === "SUPERADMIN" || norm === "ADMIN" || norm === "MEMBER") {
      throw new ValidationErrorAppError("ไม่สามารถลบบทบาทมาตรฐานของระบบได้");
    }

    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    await db.delete(userRoles).where(eq(userRoles.roleId, roleId));
    await db.delete(roles).where(eq(roles.id, roleId));

    await logAudit(
      actorUserId,
      "Delete",
      "Roles",
      roleId.toString(),
      { name: r.name }
    );

    return true;
  }

  async updateRolePermissions(
    roleId: number,
    actorUserId: number,
    permissionIds: number[]
  ): Promise<RoleDetailResponse | null> {
    const roleRes = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    if (roleRes.length === 0) return null;

    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    const now = new Date();
    for (const pid of permissionIds) {
      await db.insert(rolePermissions).values({
        roleId,
        permissionId: pid,
        createdAt: now,
      });
    }

    await logAudit(
      actorUserId,
      "Update",
      "RolePermissions",
      roleId.toString(),
      { roleId, permissionIds }
    );

    return this.getRoleById(roleId);
  }

  async getAllPermissions(): Promise<PermissionResponse[]> {
    const rows = await db
      .select()
      .from(permissions)
      .orderBy(asc(permissions.module), asc(permissions.permissionId));

    return rows.map((p) => ({
      permissionId: p.permissionId,
      permissionCode: p.permissionCode,
      permissionName: p.permissionName,
      module: p.module,
      description: p.description ?? null,
    }));
  }

  async getUsersWithRoles(): Promise<UserWithRolesResponse[]> {
    const userList = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    const roleRows = await db
      .select({
        userId: userRoles.userId,
        roleName: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id));

    const userRoleMap = new Map<number, string[]>();
    for (const r of roleRows) {
      const arr = userRoleMap.get(r.userId) ?? [];
      if (r.roleName) arr.push(r.roleName);
      userRoleMap.set(r.userId, arr);
    }

    return userList.map((u) => ({
      userId: u.id,
      email: u.email ?? "",
      displayName: u.displayName,
      isActive: u.isActive,
      roles: userRoleMap.get(u.id) ?? [],
      createdAt: u.createdAt.toISOString(),
    }));
  }

  // ----------------------------------------------------
  // 7. ADMIN CATEGORIES (SYSTEM CATEGORIES)
  // ----------------------------------------------------

  async getSystemCategories(): Promise<CategoryResponse[]> {
    const list = await db
      .select()
      .from(categories)
      .where(eq(categories.isSystem, true))
      .orderBy(asc(categories.sortOrder), asc(categories.categoryId));

    return list.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      categoryType: c.categoryType as any,
      icon: c.icon,
      color: c.color,
      sortOrder: c.sortOrder,
      isSystem: c.isSystem,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async getSystemCategoryById(id: number): Promise<CategoryResponse | null> {
    const row = await db
      .select()
      .from(categories)
      .where(and(eq(categories.categoryId, id), eq(categories.isSystem, true)))
      .limit(1);
    if (row.length === 0) return null;
    const c = row[0];

    return {
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      categoryType: c.categoryType as any,
      icon: c.icon,
      color: c.color,
      sortOrder: c.sortOrder,
      isSystem: c.isSystem,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    };
  }

  async createSystemCategory(
    actorUserId: number,
    req: CreateCategoryRequest
  ): Promise<CategoryResponse> {
    const trimmed = req.categoryName?.trim();
    if (!trimmed) {
      throw new ValidationErrorAppError("ชื่อหมวดหมู่ต้องไม่เป็นค่าว่าง");
    }

    const existing = await db
      .select({ id: categories.categoryId })
      .from(categories)
      .where(
        and(
          eq(categories.isSystem, true),
          sql`LOWER(${categories.categoryName}) = ${trimmed.toLowerCase()}`
        )
      )
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictError("มีหมวดหมู่มาตรฐานชื่อนี้อยู่แล้ว");
    }

    const maxSortRes = await db
      .select({ maxSort: sql<number>`coalesce(max(${categories.sortOrder}), 0)::int` })
      .from(categories)
      .where(eq(categories.isSystem, true));
    const sortOrder = (maxSortRes[0]?.maxSort ?? 0) + 1;

    const inserted = await db
      .insert(categories)
      .values({
        categoryName: trimmed,
        categoryType: req.categoryType,
        icon: req.icon ?? null,
        color: req.color ?? null,
        sortOrder,
        isSystem: true,
        isActive: true,
        userId: null,
        createdAt: new Date(),
      })
      .returning();

    await logAudit(
      actorUserId,
      "Create",
      "Categories",
      inserted[0].categoryId.toString(),
      { name: trimmed, isSystem: true }
    );

    return {
      categoryId: inserted[0].categoryId,
      categoryName: inserted[0].categoryName,
      categoryType: inserted[0].categoryType as any,
      icon: inserted[0].icon,
      color: inserted[0].color,
      sortOrder: inserted[0].sortOrder,
      isSystem: inserted[0].isSystem,
      isActive: inserted[0].isActive,
      createdAt: inserted[0].createdAt.toISOString(),
    };
  }

  async updateSystemCategory(
    id: number,
    actorUserId: number,
    req: UpdateCategoryRequest
  ): Promise<CategoryResponse | null> {
    const existing = await db
      .select()
      .from(categories)
      .where(and(eq(categories.categoryId, id), eq(categories.isSystem, true)))
      .limit(1);
    if (existing.length === 0) return null;

    const trimmed = req.categoryName?.trim();
    if (!trimmed) {
      throw new ValidationErrorAppError("ชื่อหมวดหมู่ต้องไม่เป็นค่าว่าง");
    }

    const conflict = await db
      .select({ id: categories.categoryId })
      .from(categories)
      .where(
        and(
          eq(categories.isSystem, true),
          sql`LOWER(${categories.categoryName}) = ${trimmed.toLowerCase()}`,
          ne(categories.categoryId, id)
        )
      )
      .limit(1);
    if (conflict.length > 0) {
      throw new ConflictError("มีหมวดหมู่มาตรฐานชื่อนี้อยู่แล้ว");
    }

    const updated = await db
      .update(categories)
      .set({
        categoryName: trimmed,
        categoryType: req.categoryType,
        icon: req.icon ?? null,
        color: req.color ?? null,
        isActive: req.isActive,
      })
      .where(eq(categories.categoryId, id))
      .returning();

    await logAudit(
      actorUserId,
      "Update",
      "Categories",
      id.toString(),
      { name: trimmed, isSystem: true, isActive: req.isActive }
    );

    return {
      categoryId: updated[0].categoryId,
      categoryName: updated[0].categoryName,
      categoryType: updated[0].categoryType as any,
      icon: updated[0].icon,
      color: updated[0].color,
      sortOrder: updated[0].sortOrder,
      isSystem: updated[0].isSystem,
      isActive: updated[0].isActive,
      createdAt: updated[0].createdAt.toISOString(),
    };
  }

  async deleteSystemCategory(id: number, actorUserId: number): Promise<boolean> {
    const existing = await db
      .select()
      .from(categories)
      .where(and(eq(categories.categoryId, id), eq(categories.isSystem, true)))
      .limit(1);
    if (existing.length === 0) return false;

    // Check if transactions use this category
    const txCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(eq(transactions.categoryId, id));
    if ((txCount[0]?.count ?? 0) > 0) {
      throw new ConflictError(
        "ไม่สามารถลบหมวดหมู่ระบบนี้ได้เนื่องจากมีรายการธุรกรรมอ้างอิงอยู่ (แนะนำให้ปิดการใช้งานแทน)"
      );
    }

    await db.delete(categories).where(eq(categories.categoryId, id));

    await logAudit(
      actorUserId,
      "Delete",
      "Categories",
      id.toString(),
      { name: existing[0].categoryName, isSystem: true }
    );

    return true;
  }

  async reorderSystemCategories(
    actorUserId: number,
    items: { categoryId: number; sortOrder: number }[]
  ): Promise<void> {
    for (const item of items) {
      await db
        .update(categories)
        .set({ sortOrder: item.sortOrder })
        .where(
          and(
            eq(categories.categoryId, item.categoryId),
            eq(categories.isSystem, true)
          )
        );
    }

    await logAudit(
      actorUserId,
      "Update",
      "Categories",
      "system-reorder",
      { count: items.length }
    );
  }

  async seedDefaultCategories(actorUserId: number): Promise<number> {
    const DefaultCategories = [
      { name: "อาหารและเครื่องดื่ม", type: "expense", icon: "Utensils", color: "#EF4444" },
      { name: "การเดินทาง / ยานพาหนะ", type: "expense", icon: "Car", color: "#F97316" },
      { name: "ช้อปปิ้ง / ของใช้", type: "expense", icon: "ShoppingBag", color: "#EC4899" },
      { name: "ที่อยู่อาศัย / บิลค่าใช้จ่าย", type: "expense", icon: "Home", color: "#8B5CF6" },
      { name: "บันเทิง / พักผ่อน", type: "expense", icon: "Film", color: "#06B6D4" },
      { name: "สุขภาพและการรักษา", type: "expense", icon: "HeartPulse", color: "#10B981" },
      { name: "การศึกษา / พัฒนาตนเอง", type: "expense", icon: "GraduationCap", color: "#3B82F6" },
      { name: "การเงินและการลงทุน", type: "expense", icon: "Banknote", color: "#6366F1" },
      { name: "เงินเดือน", type: "income", icon: "Briefcase", color: "#22C55E" },
      { name: "โบนัส / รายได้พิเศษ", type: "income", icon: "Award", color: "#EAB308" },
      { name: "ผลตอบแทนการลงทุน", type: "income", icon: "TrendingUp", color: "#14B8A6" },
      { name: "ของขวัญ / ได้รับเงิน", type: "income", icon: "Gift", color: "#A855F7" },
    ];

    const existing = await db
      .select({ name: categories.categoryName, sortOrder: categories.sortOrder })
      .from(categories)
      .where(eq(categories.isSystem, true));

    const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));
    let maxSort = existing.reduce((max, c) => Math.max(max, c.sortOrder), 0);
    let addedCount = 0;

    for (const def of DefaultCategories) {
      if (!existingNames.has(def.name.toLowerCase())) {
        maxSort++;
        await db.insert(categories).values({
          categoryName: def.name,
          categoryType: def.type,
          icon: def.icon,
          color: def.color,
          sortOrder: maxSort,
          isSystem: true,
          isActive: true,
          userId: null,
          createdAt: new Date(),
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await logAudit(
        actorUserId,
        "Import",
        "Categories",
        "seed-defaults",
        { addedCount }
      );
    }

    return addedCount;
  }

  // ----------------------------------------------------
  // 8. ADMIN IMPORT JOBS
  // ----------------------------------------------------

  async getImportJobsPaged(filter: {
    status?: string;
    jobType?: string;
    userId?: number;
    q?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PagedResult<AdminImportJob>> {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = clamp(filter.pageSize ?? 20, 1, 100);

    const conditions: any[] = [];

    if (filter.status && filter.status.trim()) {
      conditions.push(sql`LOWER(${importJobs.status}) = ${filter.status.trim().toLowerCase()}`);
    }
    if (filter.jobType && filter.jobType.trim()) {
      conditions.push(sql`LOWER(${importJobs.importType}) = ${filter.jobType.trim().toLowerCase()}`);
    }
    if (filter.userId) {
      conditions.push(eq(importJobs.userId, filter.userId));
    }
    if (filter.fromDate) {
      conditions.push(gte(importJobs.createdAt, new Date(filter.fromDate)));
    }
    if (filter.toDate) {
      conditions.push(lte(importJobs.createdAt, new Date(filter.toDate)));
    }
    if (filter.q && filter.q.trim()) {
      const search = `%${filter.q.trim().toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${importJobs.fileName}) LIKE ${search}`,
          sql`LOWER(${importJobs.errorMessage}) LIKE ${search}`
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(importJobs)
      .where(whereClause);
    const totalItems = countRes[0]?.count ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    const rows = await db
      .select()
      .from(importJobs)
      .where(whereClause)
      .orderBy(desc(importJobs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const userIds = rows.map((r) => r.userId);
    const userMap = new Map<number, { email: string; displayName: string }>();
    if (userIds.length > 0) {
      const urows = await db
        .select({ id: users.id, email: users.email, displayName: users.displayName })
        .from(users)
        .where(inArray(users.id, Array.from(new Set(userIds))));
      for (const u of urows) {
        userMap.set(u.id, { email: u.email ?? "", displayName: u.displayName });
      }
    }

    const items: AdminImportJob[] = rows.map((j) => {
      const user = userMap.get(j.userId);
      const failedRecords =
        j.totalRecords - j.importedRecords - j.duplicateRecords > 0
          ? j.totalRecords - j.importedRecords - j.duplicateRecords
          : 0;

      return {
        importJobId: j.importJobId,
        userId: j.userId,
        userEmail: user?.email ?? null,
        userDisplayName: user?.displayName ?? null,
        jobType: j.importType,
        status: j.status,
        fileName: j.fileName ?? "",
        totalRecords: j.totalRecords,
        successRecords: j.importedRecords,
        failedRecords,
        retryCount: j.retryCount,
        errorMessage: j.errorMessage ?? null,
        createdAt: j.createdAt.toISOString(),
        completedAt: j.completedAt ? j.completedAt.toISOString() : null,
      };
    });

    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  async retryImportJob(jobId: number, adminUserId: number): Promise<boolean> {
    const row = await db
      .select()
      .from(importJobs)
      .where(eq(importJobs.importJobId, jobId))
      .limit(1);
    if (row.length === 0) return false;
    const job = row[0];

    if (job.status.toLowerCase() !== "failed") {
      throw new ValidationErrorAppError("สามารถลองใหม่ได้เฉพาะงานที่สถานะ ล้มเหลว (Failed) เท่านั้น");
    }

    if (job.retryCount >= 5) {
      throw new ValidationErrorAppError("งานนี้ลองใหม่ครบจำนวนสูงสุด 5 ครั้งแล้ว ไม่สามารถลองใหม่ได้อีก");
    }

    await db
      .update(importJobs)
      .set({
        retryCount: job.retryCount + 1,
        status: "Pending",
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      })
      .where(eq(importJobs.importJobId, jobId));

    await logSecurityEvent(
      "IMPORT_JOB_RETRIED",
      job.userId,
      adminUserId,
      true,
      null,
      null,
      { jobId, retryCount: job.retryCount + 1 }
    );

    return true;
  }

  async cancelImportJob(jobId: number, adminUserId: number): Promise<boolean> {
    const row = await db
      .select()
      .from(importJobs)
      .where(eq(importJobs.importJobId, jobId))
      .limit(1);
    if (row.length === 0) return false;
    const job = row[0];

    const s = job.status.toLowerCase();
    if (s !== "pending" && s !== "processing" && s !== "needsreview") {
      throw new ValidationErrorAppError("สามารถยกเลิกได้เฉพาะงานที่อยู่ระหว่างรอดำเนินการหรือประมวลผลเท่านั้น");
    }

    await db
      .update(importJobs)
      .set({
        status: "Cancelled",
        completedAt: new Date(),
      })
      .where(eq(importJobs.importJobId, jobId));

    await logSecurityEvent(
      "IMPORT_JOB_CANCELLED",
      job.userId,
      adminUserId,
      true,
      null,
      null,
      { jobId }
    );

    return true;
  }
}

export const adminService = new AdminService();
