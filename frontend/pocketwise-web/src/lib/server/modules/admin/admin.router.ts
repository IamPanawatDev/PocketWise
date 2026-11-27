import { gatewayRegistry, type GatewayContext } from "@/lib/server/gateway-registry";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { getAuthenticatedUser, requireRoles } from "@/lib/server/auth/current-user";
import { adminService } from "./admin.service";
import type {
  AnnouncementTarget,
  MaintenanceStatus,
} from "@/types/admin-operations.types";
import type {
  CreateRoleRequest,
  UpdateRoleRequest,
} from "@/types/admin.types";
import type {
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../categories/category.service";

async function parseBody<T>(ctx: GatewayContext): Promise<T> {
  if (typeof ctx.payload?.body === "string") {
    try {
      return JSON.parse(ctx.payload.body) as T;
    } catch {
      return {} as T;
    }
  }
  return ctx.req.json().catch(() => ({} as T));
}

export function registerAdminRoutes(): void {
  const adminRoles = ["Admin", "SuperAdmin"];

  // ==========================================
  // 1. USER MANAGEMENT
  // ==========================================

  // GET /api/v1/admin/users
  gatewayRegistry.register("GET", "admin/users", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const q = ctx.searchParams.get("q") ?? undefined;
    const role = ctx.searchParams.get("role") ?? undefined;
    const isSuspendedParam = ctx.searchParams.get("isSuspended");
    const isSuspended =
      isSuspendedParam !== null ? isSuspendedParam === "true" : undefined;
    const isEmailVerifiedParam = ctx.searchParams.get("isEmailVerified");
    const isEmailVerified =
      isEmailVerifiedParam !== null ? isEmailVerifiedParam === "true" : undefined;
    const page = ctx.searchParams.get("page") ? parseInt(ctx.searchParams.get("page")!, 10) : 1;
    const pageSize = ctx.searchParams.get("pageSize") ? parseInt(ctx.searchParams.get("pageSize")!, 10) : 20;

    const result = await adminService.getUsersPaged({
      q,
      role,
      isSuspended,
      isEmailVerified,
      page,
      pageSize,
    });
    return jsonSuccess(result);
  });

  // GET /api/v1/admin/users/:id
  gatewayRegistry.register("GET", "admin/users/:id", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสผู้ใช้ไม่ถูกต้อง", 400);
    }

    const result = await adminService.getUserDetail(id);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบผู้ใช้ที่ระบุ", 404);
    }
    return jsonSuccess(result);
  });

  // POST /api/v1/admin/users/:id/suspend
  gatewayRegistry.register("POST", "admin/users/:id/suspend", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสผู้ใช้ไม่ถูกต้อง", 400);
    }

    const body = await parseBody<{ reason?: string }>(ctx);
    if (!body.reason || !body.reason.trim()) {
      return jsonError("VALIDATION_ERROR", "กรุณาระบุเหตุผลในการระงับบัญชี", 400);
    }

    if (id === admin.userId) {
      return jsonError("OPERATION_NOT_ALLOWED", "ไม่สามารถระงับบัญชีของตนเองได้", 400);
    }

    const success = await adminService.suspendUser(id, admin.userId, body.reason.trim());
    if (!success) {
      return jsonError("NOT_FOUND", "ไม่พบผู้ใช้ที่ระบุ", 404);
    }
    return jsonSuccess({ message: "ระงับบัญชีผู้ใช้เรียบร้อยแล้ว" });
  });

  // POST /api/v1/admin/users/:id/unsuspend
  gatewayRegistry.register("POST", "admin/users/:id/unsuspend", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสผู้ใช้ไม่ถูกต้อง", 400);
    }

    const success = await adminService.unsuspendUser(id, admin.userId);
    if (!success) {
      return jsonError("NOT_FOUND", "ไม่พบผู้ใช้ที่ระบุ", 404);
    }
    return jsonSuccess({ message: "ยกเลิกการระงับบัญชีเรียบร้อยแล้ว" });
  });

  // POST /api/v1/admin/users/:id/verify-email
  gatewayRegistry.register("POST", "admin/users/:id/verify-email", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสผู้ใช้ไม่ถูกต้อง", 400);
    }

    const success = await adminService.verifyEmail(id, admin.userId);
    if (!success) {
      return jsonError("OPERATION_NOT_ALLOWED", "ไม่สามารถยืนยันอีเมลได้ (ผู้ใช้ยืนยันอีเมลแล้ว หรือไม่พบข้อมูล)", 400);
    }
    return jsonSuccess({ message: "ยืนยันที่อยู่อีเมลของผู้ใช้เรียบร้อยแล้ว" });
  });

  // POST /api/v1/admin/users/:id/resend-verification
  gatewayRegistry.register("POST", "admin/users/:id/resend-verification", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสผู้ใช้ไม่ถูกต้อง", 400);
    }

    const success = await adminService.resendVerificationEmail(id);
    if (!success) {
      return jsonError("OPERATION_NOT_ALLOWED", "ไม่สามารถส่งอีเมลยืนยันได้ (ผู้ใช้ยืนยันอีเมลแล้ว หรือไม่พบข้อมูล)", 400);
    }
    return jsonSuccess({ message: "ส่งอีเมลยืนยันบัญชีเรียบร้อยแล้ว" });
  });

  // POST /api/v1/admin/users/:id/reset-password
  gatewayRegistry.register("POST", "admin/users/:id/reset-password", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสผู้ใช้ไม่ถูกต้อง", 400);
    }

    const token = await adminService.sendPasswordResetLink(id);
    if (!token) {
      return jsonError("NOT_FOUND", "ไม่พบผู้ใช้ที่ระบุ", 404);
    }
    return jsonSuccess({
      resetToken: token,
      message: "ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลผู้ใช้เรียบร้อยแล้ว",
    });
  });

  // GET /api/v1/admin/users/:id/sessions
  gatewayRegistry.register("GET", "admin/users/:id/sessions", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสผู้ใช้ไม่ถูกต้อง", 400);
    }

    const sessions = await adminService.getUserSessions(id);
    return jsonSuccess(sessions);
  });

  // POST /api/v1/admin/users/:id/sessions/:tokenId/revoke
  gatewayRegistry.register("POST", "admin/users/:id/sessions/:tokenId/revoke", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    const tokenId = Number(ctx.params?.tokenId);
    if (!id || isNaN(id) || !tokenId || isNaN(tokenId)) {
      return jsonError("BAD_REQUEST", "รหัสผู้ใช้หรือรหัสเซสชันไม่ถูกต้อง", 400);
    }

    const success = await adminService.revokeSession(id, tokenId, admin.userId);
    if (!success) {
      return jsonError("NOT_FOUND", "ไม่พบเซสชันที่ระบุ", 404);
    }
    return jsonSuccess({ message: "เพิกถอนเซสชันเรียบร้อยแล้ว" });
  });

  // POST /api/v1/admin/users/:id/sessions/revoke-all
  gatewayRegistry.register("POST", "admin/users/:id/sessions/revoke-all", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสผู้ใช้ไม่ถูกต้อง", 400);
    }

    const count = await adminService.revokeAllSessions(id, admin.userId);
    return jsonSuccess({
      revokedCount: count,
      message: `เพิกถอนเซสชันทั้งหมดเรียบร้อยแล้ว (${count} เซสชัน)`,
    });
  });

  // PUT /api/v1/admin/users/:id/roles
  gatewayRegistry.register("PUT", "admin/users/:id/roles", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสผู้ใช้ไม่ถูกต้อง", 400);
    }

    const body = await parseBody<{ roleNames: string[] }>(ctx);
    if (!body.roleNames || !Array.isArray(body.roleNames)) {
      return jsonError("VALIDATION_ERROR", "กรุณาระบุรายชื่อบทบาท (roleNames)", 400);
    }

    const result = await adminService.assignUserRoles(id, admin.userId, body.roleNames);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบผู้ใช้ที่ระบุ", 404);
    }
    return jsonSuccess(result);
  });

  // ==========================================
  // 2. SECURITY EVENTS
  // ==========================================

  // GET /api/v1/admin/security-events
  gatewayRegistry.register("GET", "admin/security-events", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const eventType = ctx.searchParams.get("eventType") ?? undefined;
    const targetUserIdParam = ctx.searchParams.get("targetUserId");
    const targetUserId = targetUserIdParam
      ? parseInt(targetUserIdParam, 10)
      : undefined;
    const actorUserIdParam = ctx.searchParams.get("actorUserId");
    const actorUserId = actorUserIdParam
      ? parseInt(actorUserIdParam, 10)
      : undefined;
    const succeededParam = ctx.searchParams.get("succeeded");
    const succeeded =
      succeededParam !== null ? succeededParam === "true" : undefined;
    const fromDate = ctx.searchParams.get("fromDate") ?? undefined;
    const toDate = ctx.searchParams.get("toDate") ?? undefined;
    const q = ctx.searchParams.get("q") ?? undefined;
    const maskIp = ctx.searchParams.get("maskIp") === "true";
    const page = ctx.searchParams.get("page") ? parseInt(ctx.searchParams.get("page")!, 10) : 1;
    const pageSize = ctx.searchParams.get("pageSize") ? parseInt(ctx.searchParams.get("pageSize")!, 10) : 20;

    const result = await adminService.getSecurityEventsPaged({
      eventType,
      targetUserId,
      actorUserId,
      succeeded,
      fromDate,
      toDate,
      q,
      maskIp,
      page,
      pageSize,
    });
    return jsonSuccess(result);
  });

  // ==========================================
  // 3. AUDIT LOGS
  // ==========================================

  // GET /api/v1/audit-logs
  gatewayRegistry.register("GET", "audit-logs", async (ctx) => {
    const user = await requireRoles(ctx, adminRoles);
    const isAdmin = user.roles.some((r) => r.toLowerCase() === "admin" || r.toLowerCase() === "superadmin");

    const page = ctx.searchParams.get("page") ? parseInt(ctx.searchParams.get("page")!, 10) : 1;
    const pageSize = ctx.searchParams.get("pageSize") ? parseInt(ctx.searchParams.get("pageSize")!, 10) : 20;
    const userIdParam = ctx.searchParams.get("userId");
    const userId = userIdParam ? parseInt(userIdParam, 10) : undefined;

    const result = await adminService.getAuditLogsPaged(
      {
        action: ctx.searchParams.get("action") ?? undefined,
        entityType: ctx.searchParams.get("entityType") ?? undefined,
        entityId: ctx.searchParams.get("entityId") ?? undefined,
        fromDate: ctx.searchParams.get("fromDate") ?? undefined,
        toDate: ctx.searchParams.get("toDate") ?? undefined,
        q: ctx.searchParams.get("q") ?? undefined,
        userId,
        page,
        pageSize,
      },
      user.userId,
      isAdmin
    );
    return jsonSuccess(result);
  });

  // GET /api/v1/audit-logs/entity-types
  gatewayRegistry.register("GET", "audit-logs/entity-types", async (ctx) => {
    const user = await requireRoles(ctx, adminRoles);
    const isAdmin = user.roles.some((r) => r.toLowerCase() === "admin" || r.toLowerCase() === "superadmin");
    const types = await adminService.getEntityTypes(user.userId, isAdmin);
    return jsonSuccess(types);
  });

  // GET /api/v1/audit-logs/settings
  gatewayRegistry.register("GET", "audit-logs/settings", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const settings = await adminService.getAuditLogSettings();
    return jsonSuccess(settings);
  });

  // PUT /api/v1/audit-logs/settings
  gatewayRegistry.register("PUT", "audit-logs/settings", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const body = await parseBody<{ isEnabled: boolean }>(ctx);
    await adminService.updateAuditLogSettings(Boolean(body.isEnabled), admin.userId);

    const message = body.isEnabled
      ? "เปิดการบันทึกประวัติการเปลี่ยนแปลง (Audit Logs) เรียบร้อยแล้ว"
      : "ปิดการบันทึกประวัติการเปลี่ยนแปลง (Audit Logs) เรียบร้อยแล้ว (ช่วยลดขนาดการใช้งานฐานข้อมูล)";

    return jsonSuccess({ isEnabled: body.isEnabled, message });
  });

  // POST /api/v1/audit-logs/purge
  gatewayRegistry.register("POST", "audit-logs/purge", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const body = await parseBody<{ olderThanDays: number }>(ctx);
    const result = await adminService.purgeAuditLogs(body.olderThanDays ?? 90, admin.userId);
    return jsonSuccess(result);
  });

  // GET /api/v1/audit-logs/:id
  gatewayRegistry.register("GET", "audit-logs/:id", async (ctx) => {
    const user = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัส Audit Log ไม่ถูกต้อง", 400);
    }

    const isAdmin = user.roles.some((r) => r.toLowerCase() === "admin" || r.toLowerCase() === "superadmin");
    const log = await adminService.getAuditLogById(id, user.userId, isAdmin);
    if (!log) {
      return jsonError("AUDIT_LOG_NOT_FOUND", "ไม่พบประวัติการเปลี่ยนแปลงที่ระบุ", 404);
    }
    return jsonSuccess(log);
  });

  // ==========================================
  // 4. OVERVIEW, SETTINGS & MAINTENANCE
  // ==========================================

  // GET /api/v1/admin/overview
  gatewayRegistry.register("GET", "admin/overview", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const overview = await adminService.getOverview();
    return jsonSuccess(overview);
  });

  // GET /api/v1/admin/settings
  gatewayRegistry.register("GET", "admin/settings", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const settings = await adminService.getAllSettings();
    return jsonSuccess(settings);
  });

  // PUT /api/v1/admin/settings/:key
  gatewayRegistry.register("PUT", "admin/settings/:key", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const key = ctx.params?.key;
    if (!key) {
      return jsonError("BAD_REQUEST", "กรุณาระบุ key ของการตั้งค่า", 400);
    }

    const body = await parseBody<{ value: string }>(ctx);
    const result = await adminService.updateSetting(key, body.value ?? "", admin.userId);
    return jsonSuccess(result);
  });

  // GET /api/v1/admin/maintenance
  gatewayRegistry.register("GET", "admin/maintenance", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const status = await adminService.getMaintenanceStatus();
    return jsonSuccess(status);
  });

  // PUT /api/v1/admin/maintenance
  gatewayRegistry.register("PUT", "admin/maintenance", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const body = await parseBody<MaintenanceStatus>(ctx);
    const updated = await adminService.updateMaintenanceStatus(admin.userId, body);
    return jsonSuccess(updated);
  });

  // ==========================================
  // 5. ANNOUNCEMENTS
  // ==========================================

  // GET /api/v1/admin/announcements
  gatewayRegistry.register("GET", "admin/announcements", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const list = await adminService.getAllAnnouncements();
    return jsonSuccess(list);
  });

  // GET /api/v1/admin/announcements/:id
  gatewayRegistry.register("GET", "admin/announcements/:id", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสประกาศไม่ถูกต้อง", 400);
    }

    const item = await adminService.getAnnouncementById(id);
    if (!item) {
      return jsonError("NOT_FOUND", "ไม่พบประกาศที่ระบุ", 404);
    }
    return jsonSuccess(item);
  });

  // POST /api/v1/admin/announcements
  gatewayRegistry.register("POST", "admin/announcements", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const body = await parseBody<{
      title: string;
      message: string;
      startsAt: string;
      endsAt: string;
      isActive: boolean;
      targets: AnnouncementTarget[];
    }>(ctx);

    const created = await adminService.createAnnouncement(admin.userId, body);
    return jsonSuccess(created, 201);
  });

  // PUT /api/v1/admin/announcements/:id
  gatewayRegistry.register("PUT", "admin/announcements/:id", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสประกาศไม่ถูกต้อง", 400);
    }

    const body = await parseBody<{
      title: string;
      message: string;
      startsAt: string;
      endsAt: string;
      isActive: boolean;
      targets: AnnouncementTarget[];
    }>(ctx);

    const updated = await adminService.updateAnnouncement(id, admin.userId, body);
    if (!updated) {
      return jsonError("NOT_FOUND", "ไม่พบประกาศที่ระบุ", 404);
    }
    return jsonSuccess(updated);
  });

  // DELETE /api/v1/admin/announcements/:id
  gatewayRegistry.register("DELETE", "admin/announcements/:id", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสประกาศไม่ถูกต้อง", 400);
    }

    const deleted = await adminService.deleteAnnouncement(id, admin.userId);
    if (!deleted) {
      return jsonError("NOT_FOUND", "ไม่พบประกาศที่ระบุ", 404);
    }
    return jsonSuccess({ message: "ลบประกาศเรียบร้อยแล้ว" });
  });

  // GET /api/v1/announcements/active (Allow anonymous)
  gatewayRegistry.register("GET", "announcements/active", async (ctx) => {
    let userId: number | undefined;
    try {
      const user = await getAuthenticatedUser(ctx);
      userId = user.userId;
    } catch {
      // Anonymous
    }

    const list = await adminService.getActiveAnnouncementsForUser(userId);
    return jsonSuccess(list);
  });

  // ==========================================
  // 6. ROLES & PERMISSIONS
  // ==========================================

  // GET /api/v1/admin/roles
  gatewayRegistry.register("GET", "admin/roles", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const list = await adminService.getRoles();
    return jsonSuccess(list);
  });

  // GET /api/v1/admin/roles/:id
  gatewayRegistry.register("GET", "admin/roles/:id", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสบทบาทไม่ถูกต้อง", 400);
    }

    const role = await adminService.getRoleById(id);
    if (!role) {
      return jsonError("NOT_FOUND", "ไม่พบบทบาทที่ระบุ", 404);
    }
    return jsonSuccess(role);
  });

  // POST /api/v1/admin/roles
  gatewayRegistry.register("POST", "admin/roles", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const body = await parseBody<CreateRoleRequest>(ctx);
    const created = await adminService.createRole(admin.userId, body);
    return jsonSuccess(created, 201);
  });

  // PUT /api/v1/admin/roles/:id
  gatewayRegistry.register("PUT", "admin/roles/:id", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสบทบาทไม่ถูกต้อง", 400);
    }

    const body = await parseBody<UpdateRoleRequest>(ctx);
    const updated = await adminService.updateRole(id, admin.userId, body);
    if (!updated) {
      return jsonError("NOT_FOUND", "ไม่พบบทบาทที่ระบุ", 404);
    }
    return jsonSuccess(updated);
  });

  // DELETE /api/v1/admin/roles/:id
  gatewayRegistry.register("DELETE", "admin/roles/:id", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสบทบาทไม่ถูกต้อง", 400);
    }

    const deleted = await adminService.deleteRole(id, admin.userId);
    if (!deleted) {
      return jsonError("NOT_FOUND", "ไม่พบบทบาทที่ระบุ", 404);
    }
    return jsonSuccess(null);
  });

  // PUT /api/v1/admin/roles/:id/permissions
  gatewayRegistry.register("PUT", "admin/roles/:id/permissions", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสบทบาทไม่ถูกต้อง", 400);
    }

    const body = await parseBody<{ permissionIds: number[] }>(ctx);
    const updated = await adminService.updateRolePermissions(id, admin.userId, body.permissionIds ?? []);
    if (!updated) {
      return jsonError("NOT_FOUND", "ไม่พบบทบาทที่ระบุ", 404);
    }
    return jsonSuccess(updated);
  });

  // GET /api/v1/admin/permissions
  gatewayRegistry.register("GET", "admin/permissions", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const perms = await adminService.getAllPermissions();
    return jsonSuccess(perms);
  });

  // GET /api/v1/admin/user-roles
  gatewayRegistry.register("GET", "admin/user-roles", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const list = await adminService.getUsersWithRoles();
    return jsonSuccess(list);
  });

  // ==========================================
  // 7. ADMIN CATEGORIES (SYSTEM CATEGORIES)
  // ==========================================

  // GET /api/v1/admin/categories
  gatewayRegistry.register("GET", "admin/categories", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const list = await adminService.getSystemCategories();
    return jsonSuccess(list);
  });

  // GET /api/v1/admin/categories/:id
  gatewayRegistry.register("GET", "admin/categories/:id", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสหมวดหมู่ไม่ถูกต้อง", 400);
    }

    const item = await adminService.getSystemCategoryById(id);
    if (!item) {
      return jsonError("NOT_FOUND", "ไม่พบหมวดหมู่มาตรฐานที่ระบุ", 404);
    }
    return jsonSuccess(item);
  });

  // POST /api/v1/admin/categories
  gatewayRegistry.register("POST", "admin/categories", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const body = await parseBody<CreateCategoryRequest>(ctx);
    const created = await adminService.createSystemCategory(admin.userId, body);
    return jsonSuccess(created, 201);
  });

  // PUT /api/v1/admin/categories/reorder
  gatewayRegistry.register("PUT", "admin/categories/reorder", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const body = await parseBody<{ items: { categoryId: number; sortOrder: number }[] }>(ctx);
    await adminService.reorderSystemCategories(admin.userId, body.items ?? []);
    return jsonSuccess(null);
  });

  // POST /api/v1/admin/categories/seed-defaults
  gatewayRegistry.register("POST", "admin/categories/seed-defaults", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const addedCount = await adminService.seedDefaultCategories(admin.userId);
    return jsonSuccess({
      addedCount,
      message: `นำเข้า/คืนค่าหมวดหมู่มาตรฐานสำเร็จ ${addedCount} รายการ`,
    });
  });

  // PUT /api/v1/admin/categories/:id
  gatewayRegistry.register("PUT", "admin/categories/:id", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสหมวดหมู่ไม่ถูกต้อง", 400);
    }

    const body = await parseBody<UpdateCategoryRequest>(ctx);
    const updated = await adminService.updateSystemCategory(id, admin.userId, body);
    if (!updated) {
      return jsonError("NOT_FOUND", "ไม่พบหมวดหมู่มาตรฐานที่ระบุ", 404);
    }
    return jsonSuccess(updated);
  });

  // DELETE /api/v1/admin/categories/:id
  gatewayRegistry.register("DELETE", "admin/categories/:id", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสหมวดหมู่ไม่ถูกต้อง", 400);
    }

    const deleted = await adminService.deleteSystemCategory(id, admin.userId);
    if (!deleted) {
      return jsonError("NOT_FOUND", "ไม่พบหมวดหมู่มาตรฐานที่ระบุ", 404);
    }
    return jsonSuccess(null, 204);
  });

  // ==========================================
  // 8. ADMIN IMPORT JOBS
  // ==========================================

  // GET /api/v1/admin/imports
  gatewayRegistry.register("GET", "admin/imports", async (ctx) => {
    await requireRoles(ctx, adminRoles);
    const status = ctx.searchParams.get("status") ?? undefined;
    const jobType = ctx.searchParams.get("jobType") ?? undefined;
    const userIdParam = ctx.searchParams.get("userId");
    const userId = userIdParam ? parseInt(userIdParam, 10) : undefined;
    const q = ctx.searchParams.get("q") ?? undefined;
    const fromDate = ctx.searchParams.get("fromDate") ?? undefined;
    const toDate = ctx.searchParams.get("toDate") ?? undefined;
    const page = ctx.searchParams.get("page") ? parseInt(ctx.searchParams.get("page")!, 10) : 1;
    const pageSize = ctx.searchParams.get("pageSize") ? parseInt(ctx.searchParams.get("pageSize")!, 10) : 20;

    const result = await adminService.getImportJobsPaged({
      status,
      jobType,
      userId,
      q,
      fromDate,
      toDate,
      page,
      pageSize,
    });
    return jsonSuccess(result);
  });

  // POST /api/v1/admin/imports/:id/retry
  gatewayRegistry.register("POST", "admin/imports/:id/retry", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสงานนำเข้าไม่ถูกต้อง", 400);
    }

    const success = await adminService.retryImportJob(id, admin.userId);
    if (!success) {
      return jsonError("NOT_FOUND", "ไม่พบบันทึกงานนำเข้าที่ระบุ", 404);
    }
    return jsonSuccess({ message: "เริ่มการลองนำเข้าไฟล์ใหม่อีกครั้งแล้ว" });
  });

  // POST /api/v1/admin/imports/:id/cancel
  gatewayRegistry.register("POST", "admin/imports/:id/cancel", async (ctx) => {
    const admin = await requireRoles(ctx, adminRoles);
    const id = Number(ctx.params?.id);
    if (!id || isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสงานนำเข้าไม่ถูกต้อง", 400);
    }

    const success = await adminService.cancelImportJob(id, admin.userId);
    if (!success) {
      return jsonError("NOT_FOUND", "ไม่พบบันทึกงานนำเข้าที่ระบุ", 404);
    }
    return jsonSuccess({ message: "ยกเลิกงานนำเข้าเรียบร้อยแล้ว" });
  });
}
