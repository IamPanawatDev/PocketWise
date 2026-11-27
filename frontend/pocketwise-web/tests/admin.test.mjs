import assert from "node:assert";
import { adminService } from "../src/lib/server/modules/admin/admin.service.ts";
import { db } from "../src/lib/server/db/index.ts";
import {
  users,
  roles,
  userRoles,
  userRefreshTokens,
  announcements,
  announcementTargets,
  importJobs,
  categories,
  auditLogs,
  securityEvents,
  systemSettings,
} from "../src/lib/server/db/schema.ts";
import { eq, and, sql } from "drizzle-orm";

async function runTests() {
  console.log("Starting Phase 6 (Task 6.1) Admin Module Integration Tests...");

  // 1. Setup Admin and Target Test User
  console.log("1. Setting up test users and roles...");
  let [adminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.normalizedName, "ADMIN"))
    .limit(1);

  if (!adminRole) {
    [adminRole] = await db
      .insert(roles)
      .values({
        name: "Admin",
        normalizedName: "ADMIN",
        description: "Administrator Role",
        isActive: true,
      })
      .returning();
  }

  // Find or create admin user
  let [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin.test@pocketwise.local"))
    .limit(1);

  if (!adminUser) {
    [adminUser] = await db
      .insert(users)
      .values({
        displayName: "Admin Tester",
        email: "admin.test@pocketwise.local",
        userName: "admin.test@pocketwise.local",
        normalizedEmail: "ADMIN.TEST@POCKETWISE.LOCAL",
        normalizedUserName: "ADMIN.TEST@POCKETWISE.LOCAL",
        isEmailVerified: true,
        emailConfirmed: true,
        isActive: true,
        isSuspended: false,
        phoneNumberConfirmed: false,
        twoFactorEnabled: false,
        lockoutEnabled: true,
        accessFailedCount: 0,
      })
      .returning();
  }

  // Assign admin role to adminUser
  const existingAdminRole = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, adminUser.id), eq(userRoles.roleId, adminRole.id)))
    .limit(1);
  if (existingAdminRole.length === 0) {
    await db.insert(userRoles).values({
      userId: adminUser.id,
      roleId: adminRole.id,
      assignedAt: new Date(),
    });
  }

  // Find or create regular test user
  const targetEmail = `target_${Date.now()}@pocketwise.local`;
  const [targetUser] = await db
    .insert(users)
    .values({
      displayName: "Target User",
      email: targetEmail,
      userName: targetEmail,
      normalizedEmail: targetEmail.toUpperCase(),
      normalizedUserName: targetEmail.toUpperCase(),
      isEmailVerified: false,
      emailConfirmed: false,
      isActive: true,
      isSuspended: false,
      phoneNumberConfirmed: false,
      twoFactorEnabled: false,
      lockoutEnabled: true,
      accessFailedCount: 0,
    })
    .returning();

  console.log(`Admin User ID: ${adminUser.id}, Target User ID: ${targetUser.id}`);

  // 2. User Management Tests
  console.log("2. Testing getUsersPaged and getUserDetail...");
  const usersPage = await adminService.getUsersPaged({ page: 1, pageSize: 10 });
  assert.ok(usersPage.items.length > 0, "Users page should have items");
  assert.ok(usersPage.totalItems >= 2, "Total users should be >= 2");

  const searchRes = await adminService.getUsersPaged({ q: "Target User" });
  assert.ok(searchRes.items.some((u) => u.id === targetUser.id), "Target user found by search");

  const detail = await adminService.getUserDetail(targetUser.id);
  assert.ok(detail !== null, "User detail should exist");
  assert.strictEqual(detail.displayName, "Target User");
  assert.strictEqual(detail.isSuspended, false);

  // 3. Admin Invariant Check: Self-Suspension Prohibited
  console.log("3. Testing Self-Suspension invariant...");
  let selfSuspendBlocked = false;
  try {
    await adminService.suspendUser(adminUser.id, adminUser.id, "Attempt self suspend");
  } catch (err) {
    selfSuspendBlocked = true;
    assert.match(err.message, /ตนเอง|Self-suspension/, "Error message should mention self-suspension prohibited");
  }
  assert.strictEqual(selfSuspendBlocked, true, "Self-suspension must throw validation error");

  // 4. Suspend Target User & Refresh Token Revocation
  console.log("4. Testing suspendUser and token revocation...");
  // Create an active refresh token for target user
  const [token] = await db
    .insert(userRefreshTokens)
    .values({
      userId: targetUser.id,
      tokenHash: `test_token_hash_${Date.now()}`,
      expiresAt: new Date(Date.now() + 7 * 86400 * 1000),
      createdByIp: "127.0.0.1",
      userAgent: "TestAgent",
    })
    .returning();

  const suspendSuccess = await adminService.suspendUser(targetUser.id, adminUser.id, "Violation of terms");
  assert.strictEqual(suspendSuccess, true);

  const suspendedDetail = await adminService.getUserDetail(targetUser.id);
  assert.strictEqual(suspendedDetail.isSuspended, true);
  assert.strictEqual(suspendedDetail.suspensionReason, "Violation of terms");

  // Verify token was revoked
  const [revokedToken] = await db
    .select()
    .from(userRefreshTokens)
    .where(eq(userRefreshTokens.refreshTokenId, token.refreshTokenId));
  assert.ok(revokedToken.revokedAt !== null, "Token should be revoked upon suspension");

  // 5. Unsuspend User
  console.log("5. Testing unsuspendUser...");
  const unsuspendSuccess = await adminService.unsuspendUser(targetUser.id, adminUser.id);
  assert.strictEqual(unsuspendSuccess, true);
  const unsuspendedDetail = await adminService.getUserDetail(targetUser.id);
  assert.strictEqual(unsuspendedDetail.isSuspended, false);

  // 6. Verify Email & Sessions
  console.log("6. Testing verifyEmail, resendVerification, resetPassword, sessions...");
  const verifyRes = await adminService.verifyEmail(targetUser.id, adminUser.id);
  assert.strictEqual(verifyRes, true);
  const verifiedDetail = await adminService.getUserDetail(targetUser.id);
  assert.strictEqual(verifiedDetail.isEmailVerified, true);

  const resendRes = await adminService.resendVerificationEmail(targetUser.id);
  // User is already verified so resend returns false
  assert.strictEqual(resendRes, false);

  const resetToken = await adminService.sendPasswordResetLink(targetUser.id);
  assert.ok(typeof resetToken === "string" && resetToken.length > 0, "Reset token generated");

  const sessions = await adminService.getUserSessions(targetUser.id);
  assert.ok(sessions.length > 0, "Sessions should list tokens");

  const revokeAllCount = await adminService.revokeAllSessions(targetUser.id, adminUser.id);
  assert.ok(revokeAllCount >= 0, "Revoke all should succeed");

  // 7. Role Assignment & Self-Demotion Invariant Check
  console.log("7. Testing Role Assignment and self-demotion invariant...");
  let selfDemoteBlocked = false;
  try {
    await adminService.assignUserRoles(adminUser.id, adminUser.id, ["Member"]);
  } catch (err) {
    selfDemoteBlocked = true;
    assert.match(err.message, /Self-demotion|เพิกถอนบทบาท Admin/, "Self-demotion must be blocked");
  }
  assert.strictEqual(selfDemoteBlocked, true);

  const assignUserRoleRes = await adminService.assignUserRoles(targetUser.id, adminUser.id, ["Admin"]);
  assert.ok(assignUserRoleRes !== null);
  assert.ok(assignUserRoleRes.roles.includes("Admin"));

  // 8. Security Events Query
  console.log("8. Testing Security Events query...");
  const secEventsPage = await adminService.getSecurityEventsPaged({
    targetUserId: targetUser.id,
    page: 1,
    pageSize: 10,
  });
  assert.ok(secEventsPage.items.length > 0, "Security events should be logged");
  assert.ok(secEventsPage.items.some((e) => e.eventType === "ACCOUNT_SUSPENDED"), "Suspended event logged");

  // 9. Audit Logs Query, Settings & Purge
  console.log("9. Testing Audit Logs query, settings, and purge...");
  const auditLogsPage = await adminService.getAuditLogsPaged({}, adminUser.id, true);
  assert.ok(auditLogsPage.items.length > 0, "Audit logs page should have entries");

  const auditSettings = await adminService.getAuditLogSettings();
  assert.strictEqual(typeof auditSettings.isEnabled, "boolean");

  await adminService.updateAuditLogSettings(true, adminUser.id);
  const updatedSettings = await adminService.getAuditLogSettings();
  assert.strictEqual(updatedSettings.isEnabled, true);

  const purgeRes = await adminService.purgeAuditLogs(3650, adminUser.id);
  assert.strictEqual(typeof purgeRes.deletedCount, "number");

  // 10. Overview, System Settings & Maintenance
  console.log("10. Testing Admin Overview, Settings, and Maintenance...");
  const overview = await adminService.getOverview();
  assert.ok(overview.totalUsers >= 2, "Overview total users >= 2");
  assert.strictEqual(typeof overview.importJobsSummary.total, "number");
  assert.strictEqual(typeof overview.securityEvents24Hours.total, "number");

  const settingKey = `Test_Setting_${Date.now()}`;
  await adminService.updateSetting(settingKey, "CustomValue", adminUser.id);
  const allSettings = await adminService.getAllSettings();
  assert.ok(allSettings.some((s) => s.settingKey === settingKey && s.settingValue === "CustomValue"));

  const maintRes = await adminService.updateMaintenanceStatus(adminUser.id, {
    isEnabled: false,
    message: "System maintenance test",
  });
  assert.strictEqual(maintRes.isEnabled, false);
  assert.strictEqual(maintRes.message, "System maintenance test");

  // 11. Announcements CRUD & User Query
  console.log("11. Testing Announcements CRUD...");
  const now = new Date();
  const startsAt = new Date(now.getTime() - 3600 * 1000).toISOString();
  const endsAt = new Date(now.getTime() + 3600 * 1000).toISOString();

  const createdAnn = await adminService.createAnnouncement(adminUser.id, {
    title: "System Update Announcement",
    message: "We have updated the system.",
    startsAt,
    endsAt,
    isActive: true,
    targets: [{ targetType: "All" }],
  });
  assert.ok(createdAnn.announcementId > 0);
  assert.strictEqual(createdAnn.title, "System Update Announcement");

  const activeAnnList = await adminService.getActiveAnnouncementsForUser(targetUser.id);
  assert.ok(activeAnnList.some((a) => a.announcementId === createdAnn.announcementId), "Announcement is active for user");

  const updatedAnn = await adminService.updateAnnouncement(createdAnn.announcementId, adminUser.id, {
    title: "System Update Announcement (Updated)",
    message: "We have updated the system successfully.",
    startsAt,
    endsAt,
    isActive: true,
    targets: [{ targetType: "All" }],
  });
  assert.strictEqual(updatedAnn.title, "System Update Announcement (Updated)");

  const deleteAnnRes = await adminService.deleteAnnouncement(createdAnn.announcementId, adminUser.id);
  assert.strictEqual(deleteAnnRes, true);

  // 12. Roles & Permissions CRUD
  console.log("12. Testing Roles and Permissions CRUD...");
  const roleName = `TestRole_${Date.now()}`;
  const createdRole = await adminService.createRole(adminUser.id, {
    name: roleName,
    description: "Temporary Test Role",
  });
  assert.strictEqual(createdRole.name, roleName);

  const updatedRole = await adminService.updateRole(createdRole.id, adminUser.id, {
    name: `${roleName}_Updated`,
    description: "Updated Description",
    isActive: true,
  });
  assert.strictEqual(updatedRole.name, `${roleName}_Updated`);

  const deleteRoleRes = await adminService.deleteRole(createdRole.id, adminUser.id);
  assert.strictEqual(deleteRoleRes, true);

  const allPerms = await adminService.getAllPermissions();
  assert.ok(Array.isArray(allPerms));

  // 13. System Categories CRUD & Seed
  console.log("13. Testing System Categories CRUD and Seed...");
  const seededCount = await adminService.seedDefaultCategories(adminUser.id);
  assert.strictEqual(typeof seededCount, "number");

  const catName = `SysCat_${Date.now()}`;
  const createdCat = await adminService.createSystemCategory(adminUser.id, {
    categoryName: catName,
    categoryType: "expense",
    icon: "Tag",
    color: "#FF0000",
  });
  assert.strictEqual(createdCat.categoryName, catName);
  assert.strictEqual(createdCat.isSystem, true);

  const updatedCat = await adminService.updateSystemCategory(createdCat.categoryId, adminUser.id, {
    categoryName: `${catName}_Edited`,
    categoryType: "expense",
    icon: "Tag",
    color: "#00FF00",
    isActive: true,
  });
  assert.strictEqual(updatedCat.categoryName, `${catName}_Edited`);

  const deleteCatRes = await adminService.deleteSystemCategory(createdCat.categoryId, adminUser.id);
  assert.strictEqual(deleteCatRes, true);

  // 14. Admin Import Jobs Management
  console.log("14. Testing Admin Import Jobs retry and cancel...");
  const [testJob] = await db
    .insert(importJobs)
    .values({
      userId: targetUser.id,
      importType: "Slip",
      fileName: "test_slip.jpg",
      status: "Failed",
      totalRecords: 1,
      importedRecords: 0,
      duplicateRecords: 0,
      errorMessage: "OCR processing failed",
      retryCount: 0,
    })
    .returning();

  const retryRes = await adminService.retryImportJob(testJob.importJobId, adminUser.id);
  assert.strictEqual(retryRes, true);

  const [retriedJob] = await db
    .select()
    .from(importJobs)
    .where(eq(importJobs.importJobId, testJob.importJobId));
  assert.strictEqual(retriedJob.status, "Pending");
  assert.strictEqual(retriedJob.retryCount, 1);

  const cancelRes = await adminService.cancelImportJob(testJob.importJobId, adminUser.id);
  assert.strictEqual(cancelRes, true);

  const [cancelledJob] = await db
    .select()
    .from(importJobs)
    .where(eq(importJobs.importJobId, testJob.importJobId));
  assert.strictEqual(cancelledJob.status, "Cancelled");

  // Clean up test data
  console.log("Cleaning up test data...");
  await db.delete(importJobs).where(eq(importJobs.importJobId, testJob.importJobId));
  await db.delete(systemSettings).where(eq(systemSettings.settingKey, settingKey));
  await db.delete(userRefreshTokens).where(eq(userRefreshTokens.userId, targetUser.id));
  await db.delete(userRoles).where(eq(userRoles.userId, targetUser.id));
  await db.delete(users).where(eq(users.id, targetUser.id));

  console.log("✅ All Phase 6 (Task 6.1) Admin Module Integration Tests Passed 100%!");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Admin Test Failed:", err);
  process.exit(1);
});
