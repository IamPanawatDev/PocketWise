-- ============================================================
-- POCKETWISE SUPABASE SEED DATA SCRIPT
-- Single Source of Truth for Roles, Permissions, System Settings & Categories
-- ============================================================

START TRANSACTION;

-- 1. System Settings
INSERT INTO "SystemSettings" ("SettingKey", "SettingValue", "Description", "UpdatedAt")
VALUES
('AuditLog:Enabled', 'true', 'เปิด/ปิด การบันทึกประวัติการเปลี่ยนแปลง (Audit Logs) ทั้งระบบ', NOW()),
('AuditLogCleanup:Enabled', 'true', 'เปิด/ปิด งานทำความสะอาด Audit Log เก่าอัตโนมัติ', NOW()),
('AuditLogCleanup:RetentionDays', '365', 'จำนวนวันจัดเก็บประวัติ Audit Log ก่อนถูกลบออก (วัน)', NOW()),
('RefreshTokenCleanup:Enabled', 'true', 'เปิด/ปิด งานทำความสะอาด Refresh Token ที่หมดอายุแล้วอัตโนมัติ', NOW()),
('Jwt:AccessTokenExpirationMinutes', '60', 'ระยะเวลาหมดอายุของ Access Token (นาที)', NOW()),
('Jwt:RefreshTokenExpirationDays', '30', 'ระยะเวลาหมดอายุของ Refresh Token เซสชันล็อกอิน (วัน)', NOW()),
('RecurringJob:IntervalMinutes', '60', 'ความถี่ในการรันประมวลผลธุรกรรมประจำอัตโนมัติ (นาที)', NOW()),
('Email:Enabled', 'true', 'เปิด/ปิด ระบบการส่งอีเมลแจ้งเตือนของระบบ', NOW()),
('Email:FromDisplayName', 'PocketWise', 'ชื่อผู้ส่งที่แสดงในหัวข้ออีเมล', NOW()),
('Maintenance:Enabled', 'false', 'เปิด/ปิด โหมดปรับปรุงระบบ (Maintenance Mode)', NOW()),
('Maintenance:Message', 'ระบบกำลังอยู่ระหว่างปรับปรุงประสิทธิภาพ กรุณากลับมาใหม่อีกครั้งในภายหลัง', 'ข้อความแจ้งเตือนผู้ใช้งานเมื่ออยู่ในโหมดปรับปรุงระบบ', NOW()),
('Maintenance:AllowedUserIds', '', 'รหัสผู้ใช้ที่ได้รับอนุญาตให้เข้าใช้งานได้ระหว่างปรับปรุงระบบ (คั่นด้วยจุลภาค)', NOW()),
('Maintenance:StartsAt', '', 'เวลาเริ่มต้นการปรับปรุงระบบ (ISO 8601 UTC)', NOW()),
('Maintenance:EndsAt', '', 'เวลาสิ้นสุดการปรับปรุงระบบโดยประมาณ (ISO 8601 UTC)', NOW())
ON CONFLICT ("SettingKey") DO UPDATE SET
    "Description" = EXCLUDED."Description";

-- 2. Initial Roles
-- SuperAdmin: เข้าถึงและจัดการได้ทุกส่วนของระบบอย่างสมบูรณ์ (29/29 permissions)
-- Admin: ผู้ดูแลระบบฝ่ายจัดการ มีสิทธิ์เฉพาะส่วนตั้งค่าและการจัดการของระบบ (16 permissions)
-- Member: สมาชิกทั่วไป สามารถบันทึกธุรกรรม จัดการงบ และดูรายงานส่วนตัว (13 permissions)
INSERT INTO "Roles" ("Id", "Name", "NormalizedName", "Description", "IsActive", "CreatedAt", "ConcurrencyStamp")
OVERRIDING SYSTEM VALUE
VALUES
(1, 'Admin', 'ADMIN', 'ผู้ดูแลระบบฝ่ายจัดการ มีสิทธิ์เข้าถึงเฉพาะส่วนตั้งค่าและการจัดการของระบบ', TRUE, NOW(), gen_random_uuid()::text),
(2, 'Member', 'MEMBER', 'สมาชิกทั่วไป สามารถบันทึกธุรกรรม จัดการงบ และดูรายงานส่วนตัว', TRUE, NOW(), gen_random_uuid()::text),
(3, 'SuperAdmin', 'SUPERADMIN', 'ผู้ดูแลระบบสูงสุด มีสิทธิ์เข้าถึงและจัดการได้ทุกส่วนของระบบอย่างสมบูรณ์', TRUE, NOW(), gen_random_uuid()::text)
ON CONFLICT ("Id") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "NormalizedName" = EXCLUDED."NormalizedName",
    "Description" = EXCLUDED."Description";

SELECT setval(pg_get_serial_sequence('"Roles"', 'Id'), coalesce(max("Id"), 1)) FROM "Roles";

-- 3. Initial Permissions (29 Standard Permissions)
INSERT INTO "Permissions" ("PermissionId", "PermissionCode", "PermissionName", "Module", "Description", "CreatedAt")
OVERRIDING SYSTEM VALUE
VALUES
(1, 'TRANSACTIONS_VIEW', 'ดูรายการธุรกรรม', 'Transactions', 'เข้าถึงและดูประวัติรายการรายรับรายจ่าย', NOW()),
(2, 'TRANSACTIONS_CREATE', 'สร้างรายการธุรกรรม', 'Transactions', 'บันทึกรายการรายรับรายจ่ายใหม่', NOW()),
(3, 'TRANSACTIONS_EDIT', 'แก้ไขรายการธุรกรรม', 'Transactions', 'แก้ไขข้อมูลรายการธุรกรรมที่มีอยู่', NOW()),
(4, 'TRANSACTIONS_DELETE', 'ลบรายการธุรกรรม', 'Transactions', 'ลบรายการธุรกรรมออกจากระบบ', NOW()),
(5, 'BUDGETS_VIEW', 'ดูงบประมาณ', 'Budgets', 'ดูแผนงบประมาณและการติดตามยอดใช้จ่าย', NOW()),
(6, 'BUDGETS_MANAGE', 'จัดการงบประมาณ', 'Budgets', 'สร้าง แก้ไข ลบแผนงบประมาณ', NOW()),
(7, 'CATEGORIES_VIEW', 'ดูหมวดหมู่และแท็ก', 'Categories', 'ดูรายการหมวดหมู่และแท็ก', NOW()),
(8, 'CATEGORIES_MANAGE', 'จัดการหมวดหมู่และแท็กส่วนตัว', 'Categories', 'สร้างและแก้ไขหมวดหมู่และแท็กของผู้ใช้', NOW()),
(9, 'SYSTEM_CATEGORIES_MANAGE', 'จัดการหมวดหมู่มาตรฐานของระบบ', 'Categories', 'เพิ่ม แก้ไข หรือนำเข้าหมวดหมู่มาตรฐานระบบ', NOW()),
(10, 'REPORTS_VIEW', 'ดูรายงานและสถิติ', 'Reports', 'ดูรายงานสรุปรายรับรายจ่ายและกราฟวิเคราะห์', NOW()),
(11, 'REPORTS_EXPORT', 'ส่งออกข้อมูลรายงาน', 'Reports', 'ดาวน์โหลดหรือส่งออกรายงานทางการเงิน', NOW()),
(12, 'IMPORTS_MANAGE', 'นำเข้าข้อมูลสลิป/ใบแจ้งยอด', 'Imports', 'อัปโหลดและประมวลผลสลิปโอนเงินและใบแจ้งยอดบัตรเครดิต', NOW()),
(13, 'ROLES_VIEW', 'ดูบทบาทและสิทธิ์', 'Admin', 'ดูรายการบทบาทและตารางสิทธิ์การเข้าถึง', NOW()),
(14, 'ROLES_MANAGE', 'จัดการบทบาทและกำหนดสิทธิ์', 'Admin', 'สร้าง แก้ไขบทบาท และกำหนดสิทธิ์ให้แต่ละบทบาท', NOW()),
(15, 'USERS_MANAGE', 'จัดการผู้ใช้และบทบาท', 'Admin', 'มอบหมายหรือเปลี่ยนแปลงบทบาทของผู้ใช้งาน', NOW()),
(16, 'AUDIT_LOGS_VIEW', 'ดูประวัติการเปลี่ยนแปลง (Audit Logs)', 'Admin', 'เข้าถึงและตรวจสอบประวัติการทำรายการ (Audit Logs) ทั้งระบบ', NOW()),
(17, 'CATEGORIZATION_VIEW', 'ดูและเข้าถึงการจัดหมวดหมู่อัตโนมัติ', 'Categorization', 'เข้าถึงหน้ากฎและการแนะนำหมวดหมู่อัตโนมัติ', NOW()),
(18, 'CATEGORIZATION_MANAGE', 'จัดการกฎและร้านค้าจัดหมวดหมู่อัตโนมัติ', 'Categorization', 'สร้าง แก้ไข ลบกฎจัดหมวดหมู่และข้อมูลร้านค้า', NOW()),
(19, 'USERS_VIEW', 'ดูข้อมูลผู้ใช้งาน', 'Admin', 'ค้นหา ดูข้อมูลบัญชี และสถานะการใช้งานของผู้ใช้', NOW()),
(20, 'SESSIONS_VIEW', 'ดูประวัติเซสชัน', 'Admin', 'ดูรายการเซสชันและอุปกรณ์ที่เข้าสู่ระบบของผู้ใช้', NOW()),
(21, 'SESSIONS_REVOKE', 'เพิกถอนเซสชัน', 'Admin', 'เพิกถอนและบังคับออกจากระบบสำหรับอุปกรณ์หรือทุกเซสชัน', NOW()),
(22, 'SECURITY_EVENTS_VIEW', 'ดูบันทึกเหตุการณ์ความปลอดภัย', 'Admin', 'เข้าถึงบันทึกเหตุการณ์ความปลอดภัย (Security Events) ของระบบ', NOW()),
(23, 'ADMIN_DASHBOARD_VIEW', 'ดูแดชบอร์ดภาพรวมผู้ดูแลระบบ', 'Admin', 'ดูสถิติและตัวชี้วัดสถานะการทำงานของระบบ', NOW()),
(24, 'IMPORT_OPERATIONS_VIEW', 'ดูงานนำเข้าทั้งระบบ', 'Admin', 'ตรวจสอบรายการและสถานะงานนำเข้าไฟล์ของผู้ใช้ทั้งหมด', NOW()),
(25, 'IMPORT_OPERATIONS_MANAGE', 'จัดการงานนำเข้าของระบบ', 'Admin', 'ลองใหม่หรือยกเลิกงานนำเข้าไฟล์ในระบบ', NOW()),
(26, 'SYSTEM_SETTINGS_VIEW', 'ดูการตั้งค่าระบบ', 'Admin', 'ดูค่าคอนฟิกและการตั้งค่ากลางของระบบ', NOW()),
(27, 'SYSTEM_SETTINGS_MANAGE', 'จัดการการตั้งค่าระบบ', 'Admin', 'แก้ไขค่าคอนฟิกและการตั้งค่ากลางของระบบ', NOW()),
(28, 'MAINTENANCE_MODE_MANAGE', 'จัดการโหมดปรับปรุงระบบ', 'Admin', 'เปิดหรือปิดการบำรุงรักษาระบบ (Maintenance Mode) และกำหนดรายชื่อยกเว้น', NOW()),
(29, 'ANNOUNCEMENTS_MANAGE', 'จัดการประกาศของระบบ', 'Admin', 'สร้าง แก้ไข และเผยแพร่ประกาศถึงผู้ใช้งานตามกลุ่มเป้าหมาย', NOW())
ON CONFLICT ("PermissionId") DO UPDATE SET
    "PermissionCode" = EXCLUDED."PermissionCode",
    "PermissionName" = EXCLUDED."PermissionName",
    "Module" = EXCLUDED."Module",
    "Description" = EXCLUDED."Description";

SELECT setval(pg_get_serial_sequence('"Permissions"', 'PermissionId'), coalesce(max("PermissionId"), 1)) FROM "Permissions";

-- 4. Role Permissions Mapping
-- 4.1 SuperAdmin (RoleId 3): Access ALL permissions (1 to 29)
INSERT INTO "RolePermissions" ("RoleId", "PermissionId", "CreatedAt")
SELECT 3, "PermissionId", NOW() FROM "Permissions"
ON CONFLICT ("RoleId", "PermissionId") DO NOTHING;

-- 4.2 Admin (RoleId 1): Access Admin operations and settings only (16 permissions)
-- Clean extraneous permissions if any
DELETE FROM "RolePermissions"
WHERE "RoleId" = 1 AND "PermissionId" NOT IN (
    SELECT "PermissionId" FROM "Permissions" WHERE "PermissionCode" IN (
        'ADMIN_DASHBOARD_VIEW',
        'ROLES_VIEW', 'ROLES_MANAGE',
        'USERS_VIEW', 'USERS_MANAGE',
        'SESSIONS_VIEW', 'SESSIONS_REVOKE',
        'SECURITY_EVENTS_VIEW',
        'IMPORT_OPERATIONS_VIEW', 'IMPORT_OPERATIONS_MANAGE',
        'SYSTEM_SETTINGS_VIEW', 'SYSTEM_SETTINGS_MANAGE',
        'MAINTENANCE_MODE_MANAGE',
        'ANNOUNCEMENTS_MANAGE',
        'AUDIT_LOGS_VIEW',
        'SYSTEM_CATEGORIES_MANAGE'
    )
);

INSERT INTO "RolePermissions" ("RoleId", "PermissionId", "CreatedAt")
SELECT 1, "PermissionId", NOW() FROM "Permissions"
WHERE "PermissionCode" IN (
    'ADMIN_DASHBOARD_VIEW',
    'ROLES_VIEW', 'ROLES_MANAGE',
    'USERS_VIEW', 'USERS_MANAGE',
    'SESSIONS_VIEW', 'SESSIONS_REVOKE',
    'SECURITY_EVENTS_VIEW',
    'IMPORT_OPERATIONS_VIEW', 'IMPORT_OPERATIONS_MANAGE',
    'SYSTEM_SETTINGS_VIEW', 'SYSTEM_SETTINGS_MANAGE',
    'MAINTENANCE_MODE_MANAGE',
    'ANNOUNCEMENTS_MANAGE',
    'AUDIT_LOGS_VIEW',
    'SYSTEM_CATEGORIES_MANAGE'
)
ON CONFLICT ("RoleId", "PermissionId") DO NOTHING;

-- 4.3 Member (RoleId 2): Access General member features only (13 permissions)
-- Clean extraneous permissions if any
DELETE FROM "RolePermissions"
WHERE "RoleId" = 2 AND "PermissionId" NOT IN (
    SELECT "PermissionId" FROM "Permissions" WHERE "PermissionCode" IN (
        'TRANSACTIONS_VIEW', 'TRANSACTIONS_CREATE', 'TRANSACTIONS_EDIT', 'TRANSACTIONS_DELETE',
        'BUDGETS_VIEW', 'BUDGETS_MANAGE',
        'CATEGORIES_VIEW', 'CATEGORIES_MANAGE',
        'CATEGORIZATION_VIEW', 'CATEGORIZATION_MANAGE',
        'REPORTS_VIEW', 'REPORTS_EXPORT',
        'IMPORTS_MANAGE'
    )
);

INSERT INTO "RolePermissions" ("RoleId", "PermissionId", "CreatedAt")
SELECT 2, "PermissionId", NOW() FROM "Permissions"
WHERE "PermissionCode" IN (
    'TRANSACTIONS_VIEW', 'TRANSACTIONS_CREATE', 'TRANSACTIONS_EDIT', 'TRANSACTIONS_DELETE',
    'BUDGETS_VIEW', 'BUDGETS_MANAGE',
    'CATEGORIES_VIEW', 'CATEGORIES_MANAGE',
    'CATEGORIZATION_VIEW', 'CATEGORIZATION_MANAGE',
    'REPORTS_VIEW', 'REPORTS_EXPORT',
    'IMPORTS_MANAGE'
)
ON CONFLICT ("RoleId", "PermissionId") DO NOTHING;

-- 5. Initial System Categories (12 standard categories)
INSERT INTO "Categories" ("CategoryName", "CategoryType", "Icon", "Color", "SortOrder", "IsSystem", "IsActive", "UserId", "CreatedAt")
VALUES
('อาหารและเครื่องดื่ม', 'Expense', 'Utensils', '#EF4444', 1, TRUE, TRUE, NULL, NOW()),
('การเดินทาง / ยานพาหนะ', 'Expense', 'Car', '#F97316', 2, TRUE, TRUE, NULL, NOW()),
('ช้อปปิ้ง / ของใช้', 'Expense', 'ShoppingBag', '#EC4899', 3, TRUE, TRUE, NULL, NOW()),
('ที่อยู่อาศัย / บิลค่าใช้จ่าย', 'Expense', 'Home', '#8B5CF6', 4, TRUE, TRUE, NULL, NOW()),
('บันเทิง / พักผ่อน', 'Expense', 'Film', '#06B6D4', 5, TRUE, TRUE, NULL, NOW()),
('สุขภาพและการรักษา', 'Expense', 'HeartPulse', '#10B981', 6, TRUE, TRUE, NULL, NOW()),
('การศึกษา / พัฒนาตนเอง', 'Expense', 'GraduationCap', '#3B82F6', 7, TRUE, TRUE, NULL, NOW()),
('การเงินและการลงทุน', 'Expense', 'Banknote', '#6366F1', 8, TRUE, TRUE, NULL, NOW()),
('เงินเดือน', 'Income', 'Briefcase', '#22C55E', 9, TRUE, TRUE, NULL, NOW()),
('โบนัส / รายได้พิเศษ', 'Income', 'Award', '#EAB308', 10, TRUE, TRUE, NULL, NOW()),
('ผลตอบแทนการลงทุน', 'Income', 'TrendingUp', '#14B8A6', 11, TRUE, TRUE, NULL, NOW()),
('ของขวัญ / ได้รับเงิน', 'Income', 'Gift', '#A855F7', 12, TRUE, TRUE, NULL, NOW())
ON CONFLICT DO NOTHING;

-- 6. Assign SuperAdmin to Developer User famreplay@gmail.com if exists
DO $$
DECLARE
    dev_user_id BIGINT;
    super_admin_role_id BIGINT := 3;
BEGIN
    SELECT "Id" INTO dev_user_id FROM "Users" WHERE "Email" = 'famreplay@gmail.com' LIMIT 1;
    IF dev_user_id IS NOT NULL THEN
        INSERT INTO "UserRoles" ("UserId", "RoleId", "AssignedAt")
        VALUES (dev_user_id, super_admin_role_id, NOW())
        ON CONFLICT ("UserId", "RoleId") DO NOTHING;
    END IF;
END $$;

COMMIT;
