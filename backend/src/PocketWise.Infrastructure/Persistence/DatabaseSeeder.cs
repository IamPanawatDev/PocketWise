using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(PocketWiseDbContext context, ILogger logger, CancellationToken cancellationToken = default)
    {
        await SeedSystemSettingsAsync(context, logger, cancellationToken);
        await SeedSystemCategoriesAsync(context, logger, cancellationToken);
        await SeedPermissionsAndRolesAsync(context, logger, cancellationToken);
    }

    private static async Task SeedSystemSettingsAsync(PocketWiseDbContext context, ILogger logger, CancellationToken cancellationToken)
    {
        try
        {
            await context.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS ""SystemSettings"" (
    ""SettingKey"" VARCHAR(100) NOT NULL PRIMARY KEY,
    ""SettingValue"" VARCHAR(500) NOT NULL,
    ""Description"" VARCHAR(500) NULL,
    ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ""UpdatedByUserId"" BIGINT NULL
);
", cancellationToken);

            var defaultSettings = new Dictionary<string, (string Value, string Description)>
            {
                ["AuditLog:Enabled"] = ("true", "เปิด/ปิด การบันทึกประวัติการเปลี่ยนแปลง (Audit Logs) ทั้งระบบ"),
                ["AuditLogCleanup:Enabled"] = ("true", "เปิด/ปิด งานทำความสะอาด Audit Log เก่าอัตโนมัติ"),
                ["AuditLogCleanup:RetentionDays"] = ("365", "จำนวนวันจัดเก็บประวัติ Audit Log ก่อนถูกลบออก (วัน)"),
                ["RefreshTokenCleanup:Enabled"] = ("true", "เปิด/ปิด งานทำความสะอาด Refresh Token ที่หมดอายุแล้วอัตโนมัติ"),
                ["Jwt:AccessTokenExpirationMinutes"] = ("60", "ระยะเวลาหมดอายุของ Access Token (นาที)"),
                ["Jwt:RefreshTokenExpirationDays"] = ("30", "ระยะเวลาหมดอายุของ Refresh Token เซสชันล็อกอิน (วัน)"),
                ["RecurringJob:IntervalMinutes"] = ("60", "ความถี่ในการรันประมวลผลธุรกรรมประจำอัตโนมัติ (นาที)"),
                ["Email:Enabled"] = ("true", "เปิด/ปิด ระบบการส่งอีเมลแจ้งเตือนของระบบ"),
                ["Email:FromDisplayName"] = ("PocketWise", "ชื่อผู้ส่งที่แสดงในหัวข้ออีเมล"),
                ["Maintenance:Enabled"] = ("false", "เปิด/ปิด โหมดปรับปรุงระบบ (Maintenance Mode)"),
                ["Maintenance:Message"] = ("ระบบกำลังอยู่ระหว่างปรับปรุงประสิทธิภาพ กรุณากลับมาใหม่อีกครั้งในภายหลัง", "ข้อความแจ้งเตือนผู้ใช้งานเมื่ออยู่ในโหมดปรับปรุงระบบ"),
                ["Maintenance:AllowedUserIds"] = ("", "รหัสผู้ใช้ที่ได้รับอนุญาตให้เข้าใช้งานได้ระหว่างปรับปรุงระบบ (คั่นด้วยจุลภาค)"),
                ["Maintenance:StartsAt"] = ("", "เวลาเริ่มต้นการปรับปรุงระบบ (ISO 8601 UTC)"),
                ["Maintenance:EndsAt"] = ("", "เวลาสิ้นสุดการปรับปรุงระบบโดยประมาณ (ISO 8601 UTC)")
            };

            foreach (var kvp in defaultSettings)
            {
                var existing = await context.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey == kvp.Key, cancellationToken);
                if (existing == null)
                {
                    context.SystemSettings.Add(new SystemSetting
                    {
                        SettingKey = kvp.Key,
                        SettingValue = kvp.Value.Value,
                        Description = kvp.Value.Description,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }
            await context.SaveChangesAsync(cancellationToken);
            logger.LogInformation("[DatabaseSeeder] System settings verified/seeded.");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[DatabaseSeeder] Failed to seed system settings table.");
        }
    }

    private static async Task SeedSystemCategoriesAsync(PocketWiseDbContext context, ILogger logger, CancellationToken cancellationToken)
    {
        if (await context.Categories.AnyAsync(c => c.IsSystem, cancellationToken))
        {
            return;
        }

        logger.LogInformation("[DatabaseSeeder] Seeding default system categories...");

        var defaultCategories = new List<Category>
        {
            // Expenses
            new() { CategoryName = "อาหารและเครื่องดื่ม", CategoryType = CategoryType.Expense, Icon = "Utensils", Color = "#EF4444", SortOrder = 1, IsSystem = true, IsActive = true, UserId = null, CreatedAt = DateTime.UtcNow },
            new() { CategoryName = "การเดินทาง / ยานพาหนะ", CategoryType = CategoryType.Expense, Icon = "Car", Color = "#F97316", SortOrder = 2, IsSystem = true, IsActive = true, UserId = null, CreatedAt = DateTime.UtcNow },
            new() { CategoryName = "ช้อปปิ้ง / ของใช้", CategoryType = CategoryType.Expense, Icon = "ShoppingBag", Color = "#EC4899", SortOrder = 3, IsSystem = true, IsActive = true, UserId = null, CreatedAt = DateTime.UtcNow },
            new() { CategoryName = "ที่อยู่อาศัย / บิลค่าใช้จ่าย", CategoryType = CategoryType.Expense, Icon = "Home", Color = "#8B5CF6", SortOrder = 4, IsSystem = true, IsActive = true, UserId = null, CreatedAt = DateTime.UtcNow },
            new() { CategoryName = "บันเทิง / พักผ่อน", CategoryType = CategoryType.Expense, Icon = "Film", Color = "#06B6D4", SortOrder = 5, IsSystem = true, IsActive = true, UserId = null, CreatedAt = DateTime.UtcNow },
            new() { CategoryName = "สุขภาพและการรักษา", CategoryType = CategoryType.Expense, Icon = "HeartPulse", Color = "#10B981", SortOrder = 6, IsSystem = true, IsActive = true, UserId = null, CreatedAt = DateTime.UtcNow },
            new() { CategoryName = "การศึกษา / พัฒนาตนเอง", CategoryType = CategoryType.Expense, Icon = "GraduationCap", Color = "#3B82F6", SortOrder = 7, IsSystem = true, IsActive = true, UserId = null, CreatedAt = DateTime.UtcNow },
            new() { CategoryName = "การเงินและการลงทุน", CategoryType = CategoryType.Expense, Icon = "Banknote", Color = "#6366F1", SortOrder = 8, IsSystem = true, IsActive = true, UserId = null, CreatedAt = DateTime.UtcNow },

            // Income
            new() { CategoryName = "เงินเดือน", CategoryType = CategoryType.Income, Icon = "Briefcase", Color = "#22C55E", SortOrder = 9, IsSystem = true, IsActive = true, UserId = null, CreatedAt = DateTime.UtcNow },
            new() { CategoryName = "โบนัส / รายได้พิเศษ", CategoryType = CategoryType.Income, Icon = "Award", Color = "#EAB308", SortOrder = 10, IsSystem = true, IsActive = true, UserId = null, CreatedAt = DateTime.UtcNow },
            new() { CategoryName = "ผลตอบแทนการลงทุน", CategoryType = CategoryType.Income, Icon = "TrendingUp", Color = "#14B8A6", SortOrder = 11, IsSystem = true, IsActive = true, UserId = null, CreatedAt = DateTime.UtcNow },
            new() { CategoryName = "ของขวัญ / ได้รับเงิน", CategoryType = CategoryType.Income, Icon = "Gift", Color = "#A855F7", SortOrder = 12, IsSystem = true, IsActive = true, UserId = null, CreatedAt = DateTime.UtcNow }
        };

        context.Categories.AddRange(defaultCategories);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("[DatabaseSeeder] {Count} system categories seeded successfully.", defaultCategories.Count);
    }

    private static async Task SeedPermissionsAndRolesAsync(PocketWiseDbContext context, ILogger logger, CancellationToken cancellationToken)
    {
        // 1. Seed Permissions
        var permissions = new List<Permission>
        {
            // Transactions
            new() { PermissionCode = "TRANSACTIONS_VIEW", PermissionName = "ดูรายการธุรกรรม", Module = "Transactions", Description = "เข้าถึงและดูประวัติรายการรายรับรายจ่าย", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "TRANSACTIONS_CREATE", PermissionName = "สร้างรายการธุรกรรม", Module = "Transactions", Description = "บันทึกรายการรายรับรายจ่ายใหม่", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "TRANSACTIONS_EDIT", PermissionName = "แก้ไขรายการธุรกรรม", Module = "Transactions", Description = "แก้ไขข้อมูลรายการธุรกรรมที่มีอยู่", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "TRANSACTIONS_DELETE", PermissionName = "ลบรายการธุรกรรม", Module = "Transactions", Description = "ลบรายการธุรกรรมออกจากระบบ", CreatedAt = DateTime.UtcNow },

            // Budgets
            new() { PermissionCode = "BUDGETS_VIEW", PermissionName = "ดูงบประมาณ", Module = "Budgets", Description = "ดูแผนงบประมาณและการติดตามยอดใช้จ่าย", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "BUDGETS_MANAGE", PermissionName = "จัดการงบประมาณ", Module = "Budgets", Description = "สร้าง แก้ไข ลบแผนงบประมาณ", CreatedAt = DateTime.UtcNow },

            // Categories & Tags
            new() { PermissionCode = "CATEGORIES_VIEW", PermissionName = "ดูหมวดหมู่และแท็ก", Module = "Categories", Description = "ดูรายการหมวดหมู่และแท็ก", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "CATEGORIES_MANAGE", PermissionName = "จัดการหมวดหมู่และแท็กส่วนตัว", Module = "Categories", Description = "สร้างและแก้ไขหมวดหมู่และแท็กของผู้ใช้", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "SYSTEM_CATEGORIES_MANAGE", PermissionName = "จัดการหมวดหมู่มาตรฐานของระบบ", Module = "Categories", Description = "เพิ่ม แก้ไข หรือนำเข้าหมวดหมู่มาตรฐานระบบ", CreatedAt = DateTime.UtcNow },

            // Categorization
            new() { PermissionCode = "CATEGORIZATION_VIEW", PermissionName = "ดูและเข้าถึงการจัดหมวดหมู่อัตโนมัติ", Module = "Categorization", Description = "เข้าถึงหน้ากฎและการแนะนำหมวดหมู่อัตโนมัติ", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "CATEGORIZATION_MANAGE", PermissionName = "จัดการกฎและร้านค้าจัดหมวดหมู่อัตโนมัติ", Module = "Categorization", Description = "สร้าง แก้ไข ลบกฎจัดหมวดหมู่และข้อมูลร้านค้า", CreatedAt = DateTime.UtcNow },

            // Reports
            new() { PermissionCode = "REPORTS_VIEW", PermissionName = "ดูรายงานและสถิติ", Module = "Reports", Description = "ดูรายงานสรุปรายรับรายจ่ายและกราฟวิเคราะห์", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "REPORTS_EXPORT", PermissionName = "ส่งออกข้อมูลรายงาน", Module = "Reports", Description = "ดาวน์โหลดหรือส่งออกรายงานทางการเงิน", CreatedAt = DateTime.UtcNow },

            // Imports
            new() { PermissionCode = "IMPORTS_MANAGE", PermissionName = "นำเข้าข้อมูลสลิป/ใบแจ้งยอด", Module = "Imports", Description = "อัปโหลดและประมวลผลสลิปโอนเงินและใบแจ้งยอดบัตรเครดิต", CreatedAt = DateTime.UtcNow },

            // Admin
            new() { PermissionCode = "ROLES_VIEW", PermissionName = "ดูบทบาทและสิทธิ์", Module = "Admin", Description = "ดูรายการบทบาทและตารางสิทธิ์การเข้าถึง", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "ROLES_MANAGE", PermissionName = "จัดการบทบาทและกำหนดสิทธิ์", Module = "Admin", Description = "สร้าง แก้ไขบทบาท และกำหนดสิทธิ์ให้แต่ละบทบาท", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "USERS_VIEW", PermissionName = "ดูข้อมูลผู้ใช้งาน", Module = "Admin", Description = "ค้นหา ดูข้อมูลบัญชี และสถานะการใช้งานของผู้ใช้", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "USERS_MANAGE", PermissionName = "จัดการผู้ใช้และบทบาท", Module = "Admin", Description = "มอบหมาย เปลี่ยนแปลงบทบาท และระงับบัญชีผู้ใช้", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "SESSIONS_VIEW", PermissionName = "ดูประวัติเซสชัน", Module = "Admin", Description = "ดูรายการเซสชันและอุปกรณ์ที่เข้าสู่ระบบของผู้ใช้", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "SESSIONS_REVOKE", PermissionName = "เพิกถอนเซสชัน", Module = "Admin", Description = "เพิกถอนและบังคับออกจากระบบสำหรับอุปกรณ์หรือทุกเซสชัน", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "SECURITY_EVENTS_VIEW", PermissionName = "ดูบันทึกเหตุการณ์ความปลอดภัย", Module = "Admin", Description = "เข้าถึงบันทึกเหตุการณ์ความปลอดภัย (Security Events) ของระบบ", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "ADMIN_DASHBOARD_VIEW", PermissionName = "ดูแดชบอร์ดภาพรวมผู้ดูแลระบบ", Module = "Admin", Description = "ดูสถิติและตัวชี้วัดสถานะการทำงานของระบบ", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "IMPORT_OPERATIONS_VIEW", PermissionName = "ดูงานนำเข้าทั้งระบบ", Module = "Admin", Description = "ตรวจสอบรายการและสถานะงานนำเข้าไฟล์ของผู้ใช้ทั้งหมด", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "IMPORT_OPERATIONS_MANAGE", PermissionName = "จัดการงานนำเข้าของระบบ", Module = "Admin", Description = "ลองใหม่หรือยกเลิกงานนำเข้าไฟล์ในระบบ", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "SYSTEM_SETTINGS_VIEW", PermissionName = "ดูการตั้งค่าระบบ", Module = "Admin", Description = "ดูค่าคอนฟิกและการตั้งค่ากลางของระบบ", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "SYSTEM_SETTINGS_MANAGE", PermissionName = "จัดการการตั้งค่าระบบ", Module = "Admin", Description = "แก้ไขค่าคอนฟิกและการตั้งค่ากลางของระบบ", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "MAINTENANCE_MODE_MANAGE", PermissionName = "จัดการโหมดปรับปรุงระบบ", Module = "Admin", Description = "เปิดหรือปิดการบำรุงรักษาระบบ (Maintenance Mode) และกำหนดรายชื่อยกเว้น", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "ANNOUNCEMENTS_MANAGE", PermissionName = "จัดการประกาศของระบบ", Module = "Admin", Description = "สร้าง แก้ไข และเผยแพร่ประกาศถึงผู้ใช้งานตามกลุ่มเป้าหมาย", CreatedAt = DateTime.UtcNow },
            new() { PermissionCode = "AUDIT_LOGS_VIEW", PermissionName = "ดูประวัติการเปลี่ยนแปลง (Audit Logs)", Module = "Admin", Description = "เข้าถึงและตรวจสอบประวัติการทำรายการ (Audit Logs) ทั้งระบบ", CreatedAt = DateTime.UtcNow },
        };

        var existingCodes = await context.Permissions.Select(p => p.PermissionCode).ToListAsync(cancellationToken);
        var missingPerms = permissions.Where(p => !existingCodes.Contains(p.PermissionCode)).ToList();
        if (missingPerms.Count > 0)
        {
            context.Permissions.AddRange(missingPerms);
            await context.SaveChangesAsync(cancellationToken);
            logger.LogInformation("[DatabaseSeeder] {Count} new permissions seeded.", missingPerms.Count);
        }

        // 2. Seed Roles
        var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.NormalizedName == "ADMIN", cancellationToken);
        if (adminRole == null)
        {
            logger.LogInformation("[DatabaseSeeder] Creating Admin role...");
            adminRole = new ApplicationRole
            {
                Name = "Admin",
                NormalizedName = "ADMIN",
                Description = "ผู้ดูแลระบบ มีสิทธิ์เข้าถึงและจัดการได้ทุกส่วนของระบบ",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Roles.Add(adminRole);
            await context.SaveChangesAsync(cancellationToken);
        }

        var memberRole = await context.Roles.FirstOrDefaultAsync(r => r.NormalizedName == "MEMBER", cancellationToken);
        if (memberRole == null)
        {
            logger.LogInformation("[DatabaseSeeder] Creating Member role...");
            memberRole = new ApplicationRole
            {
                Name = "Member",
                NormalizedName = "MEMBER",
                Description = "สมาชิกทั่วไป สามารถบันทึกธุรกรรม จัดการงบ และดูรายงานส่วนตัว",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Roles.Add(memberRole);
            await context.SaveChangesAsync(cancellationToken);
        }

        // 3. Assign Permissions to Admin Role (ALL permissions)
        var allPermissions = await context.Permissions.ToListAsync(cancellationToken);
        var existingAdminPermIds = await context.ApplicationRolePermissions
            .Where(rp => rp.RoleId == adminRole.Id)
            .Select(rp => rp.PermissionId)
            .ToListAsync(cancellationToken);

        var missingAdminPerms = allPermissions
            .Where(p => !existingAdminPermIds.Contains(p.PermissionId))
            .Select(p => new ApplicationRolePermission
            {
                RoleId = adminRole.Id,
                PermissionId = p.PermissionId,
                CreatedAt = DateTime.UtcNow
            })
            .ToList();

        if (missingAdminPerms.Count > 0)
        {
            context.ApplicationRolePermissions.AddRange(missingAdminPerms);
            await context.SaveChangesAsync(cancellationToken);
            logger.LogInformation("[DatabaseSeeder] Assigned {Count} permissions to Admin role.", missingAdminPerms.Count);
        }

        // 4. Assign Standard Permissions to Member Role
        var existingMemberPermIds = await context.ApplicationRolePermissions
            .Where(rp => rp.RoleId == memberRole.Id)
            .Select(rp => rp.PermissionId)
            .ToListAsync(cancellationToken);

        var memberPermCodes = new HashSet<string>
        {
            "TRANSACTIONS_VIEW", "TRANSACTIONS_CREATE", "TRANSACTIONS_EDIT", "TRANSACTIONS_DELETE",
            "BUDGETS_VIEW", "BUDGETS_MANAGE",
            "CATEGORIES_VIEW", "CATEGORIES_MANAGE", "CATEGORIZATION_VIEW", "CATEGORIZATION_MANAGE",
            "REPORTS_VIEW", "REPORTS_EXPORT", "IMPORTS_MANAGE"
        };

        var missingMemberPerms = allPermissions
            .Where(p => memberPermCodes.Contains(p.PermissionCode) && !existingMemberPermIds.Contains(p.PermissionId))
            .Select(p => new ApplicationRolePermission
            {
                RoleId = memberRole.Id,
                PermissionId = p.PermissionId,
                CreatedAt = DateTime.UtcNow
            })
            .ToList();

        if (missingMemberPerms.Count > 0)
        {
            context.ApplicationRolePermissions.AddRange(missingMemberPerms);
            await context.SaveChangesAsync(cancellationToken);
            logger.LogInformation("[DatabaseSeeder] Assigned {Count} permissions to Member role.", missingMemberPerms.Count);
        }

        // 5. Ensure Existing Users have Admin role assigned so the developer can access immediately
        var users = await context.Users.ToListAsync(cancellationToken);
        foreach (var user in users)
        {
            var hasRole = await context.UserRoles.AnyAsync(ur => ur.UserId == user.Id, cancellationToken);
            if (!hasRole)
            {
                context.UserRoles.Add(new ApplicationUserRole
                {
                    UserId = user.Id,
                    RoleId = adminRole.Id,
                    AssignedAt = DateTime.UtcNow
                });
                logger.LogInformation("[DatabaseSeeder] Assigned Admin role to user {Email} (ID {Id}).", user.Email, user.Id);
            }
        }
        await context.SaveChangesAsync(cancellationToken);
    }
}
