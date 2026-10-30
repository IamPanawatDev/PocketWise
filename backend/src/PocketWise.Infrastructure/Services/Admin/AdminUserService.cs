using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Services.Admin;

public class AdminUserService : IAdminUserService
{
    private readonly PocketWiseDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IEmailService _emailService;
    private readonly ISecurityEventService _securityEventService;
    private readonly ILogger<AdminUserService> _logger;

    public AdminUserService(
        PocketWiseDbContext context,
        UserManager<ApplicationUser> userManager,
        IEmailService emailService,
        ISecurityEventService securityEventService,
        ILogger<AdminUserService> logger)
    {
        _context = context;
        _userManager = userManager;
        _emailService = emailService;
        _securityEventService = securityEventService;
        _logger = logger;
    }

    public async Task<PagedResult<AdminUserListItemResponse>> GetUsersPagedAsync(
        string? q,
        string? role,
        bool? isSuspended,
        bool? isEmailVerified,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Users
            .Include(u => u.SuspendedByUser)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var search = q.Trim().ToLower();
            query = query.Where(u =>
                (u.Email != null && u.Email.ToLower().Contains(search)) ||
                u.DisplayName.ToLower().Contains(search));
        }

        if (isSuspended.HasValue)
        {
            query = query.Where(u => u.IsSuspended == isSuspended.Value);
        }

        if (isEmailVerified.HasValue)
        {
            query = query.Where(u => u.IsEmailVerified == isEmailVerified.Value);
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            var targetRole = role.Trim().ToUpperInvariant();
            var roleUserIds = _context.UserRoles
                .Join(_context.Roles.Where(r => r.NormalizedName == targetRole),
                      ur => ur.RoleId,
                      r => r.Id,
                      (ur, r) => ur.UserId);

            query = query.Where(u => roleUserIds.Contains(u.Id));
        }

        var total = await query.CountAsync(cancellationToken);

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var userIds = users.Select(u => u.Id).ToList();

        // Load roles for these users
        var userRolesMap = await (
            from ur in _context.UserRoles
            where userIds.Contains(ur.UserId)
            join r in _context.Roles on ur.RoleId equals r.Id
            select new { ur.UserId, RoleName = r.Name ?? "" }
        ).GroupBy(x => x.UserId)
         .ToDictionaryAsync(g => g.Key, g => g.Select(x => x.RoleName).ToList(), cancellationToken);

        // Load last successful login timestamp for these users
        var lastLoginMap = await _context.SecurityEvents
            .Where(e => e.TargetUserId.HasValue && userIds.Contains(e.TargetUserId.Value) && e.EventType == "LOGIN_SUCCEEDED")
            .GroupBy(e => e.TargetUserId!.Value)
            .Select(g => new { UserId = g.Key, LastLoginAt = g.Max(e => e.OccurredAt) })
            .ToDictionaryAsync(x => x.UserId, x => (DateTime?)x.LastLoginAt, cancellationToken);

        var items = users.Select(u => new AdminUserListItemResponse
        {
            Id = u.Id,
            Email = u.Email ?? string.Empty,
            DisplayName = u.DisplayName,
            IsEmailVerified = u.IsEmailVerified,
            IsActive = u.IsActive,
            IsSuspended = u.IsSuspended,
            SuspendedAt = u.SuspendedAt,
            SuspensionReason = u.SuspensionReason,
            SuspendedByDisplayName = u.SuspendedByUser?.DisplayName,
            CreatedAt = u.CreatedAt,
            Roles = userRolesMap.GetValueOrDefault(u.Id, []),
            LastLoginAt = lastLoginMap.GetValueOrDefault(u.Id)
        }).ToList();

        return new PagedResult<AdminUserListItemResponse>(items, page, pageSize, total);
    }

    public async Task<AdminUserDetailResponse?> GetUserDetailAsync(long userId, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.SuspendedByUser)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null) return null;

        var roles = await (
            from ur in _context.UserRoles
            where ur.UserId == userId
            join r in _context.Roles on ur.RoleId equals r.Id
            select r.Name ?? ""
        ).ToListAsync(cancellationToken);

        var lastLogin = await _context.SecurityEvents
            .Where(e => e.TargetUserId == userId && e.EventType == "LOGIN_SUCCEEDED")
            .OrderByDescending(e => e.OccurredAt)
            .Select(e => (DateTime?)e.OccurredAt)
            .FirstOrDefaultAsync(cancellationToken);

        var totalTransactions = await _context.Transactions.CountAsync(t => t.UserId == userId, cancellationToken);
        var totalBankAccounts = await _context.BankAccounts.CountAsync(b => b.UserId == userId, cancellationToken);
        var totalCreditCards = await _context.CreditCards.CountAsync(c => c.UserId == userId, cancellationToken);
        var activeSessions = await _context.UserRefreshTokens.CountAsync(
            t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > DateTime.UtcNow,
            cancellationToken);

        var recentEvents = await _context.SecurityEvents
            .Include(e => e.ActorUser)
            .Where(e => e.TargetUserId == userId)
            .OrderByDescending(e => e.OccurredAt)
            .Take(10)
            .Select(e => new SecurityEventResponse
            {
                SecurityEventId = e.SecurityEventId,
                EventType = e.EventType,
                TargetUserId = e.TargetUserId,
                TargetUserEmail = user.Email,
                TargetUserDisplayName = user.DisplayName,
                ActorUserId = e.ActorUserId,
                ActorUserDisplayName = e.ActorUser != null ? e.ActorUser.DisplayName : null,
                Succeeded = e.Succeeded,
                IpAddress = e.IpAddress,
                UserAgent = e.UserAgent,
                DetailsJson = e.DetailsJson,
                OccurredAt = e.OccurredAt
            })
            .ToListAsync(cancellationToken);

        return new AdminUserDetailResponse
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName,
            BirthDate = user.BirthDate,
            IsEmailVerified = user.IsEmailVerified,
            IsActive = user.IsActive,
            IsSuspended = user.IsSuspended,
            SuspendedAt = user.SuspendedAt,
            SuspensionReason = user.SuspensionReason,
            SuspendedByDisplayName = user.SuspendedByUser?.DisplayName,
            CreatedAt = user.CreatedAt,
            Roles = roles,
            LastLoginAt = lastLogin,
            TotalTransactionsCount = totalTransactions,
            TotalBankAccountsCount = totalBankAccounts,
            TotalCreditCardsCount = totalCreditCards,
            ActiveSessionsCount = activeSessions,
            RecentSecurityEvents = recentEvents
        };
    }

    public async Task<bool> SuspendUserAsync(long userId, long adminUserId, string reason, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null) return false;

        user.IsSuspended = true;
        user.SuspendedAt = DateTime.UtcNow;
        user.SuspendedByUserId = adminUserId;
        user.SuspensionReason = reason;

        // Revoke all active refresh tokens
        var tokens = await _context.UserRefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var token in tokens)
        {
            token.RevokedAt = DateTime.UtcNow;
            token.ReasonRevoked = RevokeReason.RevokedByAdmin;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _securityEventService.LogEventAsync(
            "ACCOUNT_SUSPENDED",
            targetUserId: userId,
            actorUserId: adminUserId,
            succeeded: true,
            ipAddress: null,
            userAgent: null,
            details: new { reason },
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<bool> UnsuspendUserAsync(long userId, long adminUserId, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null) return false;

        user.IsSuspended = false;
        user.SuspendedAt = null;
        user.SuspendedByUserId = null;
        user.SuspensionReason = null;

        await _context.SaveChangesAsync(cancellationToken);

        await _securityEventService.LogEventAsync(
            "ACCOUNT_UNSUSPENDED",
            targetUserId: userId,
            actorUserId: adminUserId,
            succeeded: true,
            ipAddress: null,
            userAgent: null,
            details: new { message = "Account unsuspended by admin" },
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<bool> ResendVerificationEmailAsync(long userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsEmailVerified || string.IsNullOrEmpty(user.Email))
        {
            return false;
        }

        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var subject = "[PocketWise] ยืนยันอีเมลสำหรับบัญชีของคุณ";
        var body = $@"
            <div style=""font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"">
                <h2>ยืนยันอีเมลสำหรับ PocketWise</h2>
                <p>สวัสดีคุณ {user.DisplayName},</p>
                <p>ผู้ดูแลระบบได้ส่งคำขอยืนยันอีเมลสำหรับบัญชีของคุณ กรุณาใช้รหัสยืนยันด้านล่างนี้:</p>
                <div style=""background: #f3f4f6; padding: 15px; border-radius: 8px; font-weight: bold; font-size: 18px; text-align: center; margin: 20px 0;"">
                    {token}
                </div>
                <p>หากคุณไม่ได้ร้องขอ สามารถเพิกเฉยต่ออีเมลฉบับนี้ได้</p>
            </div>";

        return await _emailService.SendEmailAsync(user.Email, subject, body, cancellationToken);
    }

    public async Task<string?> SendPasswordResetLinkAsync(long userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || string.IsNullOrEmpty(user.Email))
        {
            return null;
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var subject = "[PocketWise] คำขอตั้งรหัสผ่านใหม่";
        var body = $@"
            <div style=""font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"">
                <h2>ตั้งรหัสผ่านใหม่สำหรับ PocketWise</h2>
                <p>สวัสดีคุณ {user.DisplayName},</p>
                <p>ผู้ดูแลระบบได้ส่งรหัสสำหรับรีเซ็ตรหัสผ่านของคุณ กรุณาใช้รหัสด้านล่างนี้เพื่อตั้งรหัสผ่านใหม่:</p>
                <div style=""background: #f3f4f6; padding: 15px; border-radius: 8px; font-weight: bold; font-size: 18px; text-align: center; margin: 20px 0;"">
                    {token}
                </div>
                <p>หากคุณไม่ได้ร้องขอ โปรดแจ้งผู้ดูแลระบบทันที</p>
            </div>";

        await _emailService.SendEmailAsync(user.Email, subject, body, cancellationToken);
        return token;
    }

    public async Task<List<AdminUserSessionResponse>> GetUserSessionsAsync(long userId, long? currentSessionId, CancellationToken cancellationToken = default)
    {
        var tokens = await _context.UserRefreshTokens
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .ToListAsync(cancellationToken);

        return tokens.Select(t => new AdminUserSessionResponse
        {
            Id = t.RefreshTokenId,
            DeviceName = t.UserAgent,
            IpAddress = t.CreatedByIp,
            LastUsedAt = t.CreatedAt,
            CreatedAt = t.CreatedAt,
            ExpiresAt = t.ExpiresAt,
            IsRevoked = t.RevokedAt != null,
            IsCurrent = currentSessionId.HasValue && t.RefreshTokenId == currentSessionId.Value
        }).ToList();
    }

    public async Task<bool> RevokeSessionAsync(long userId, long tokenId, long adminUserId, CancellationToken cancellationToken = default)
    {
        var token = await _context.UserRefreshTokens
            .FirstOrDefaultAsync(t => t.RefreshTokenId == tokenId && t.UserId == userId, cancellationToken);

        if (token == null) return false;

        token.RevokedAt = DateTime.UtcNow;
        token.ReasonRevoked = RevokeReason.RevokedByAdmin;
        await _context.SaveChangesAsync(cancellationToken);

        await _securityEventService.LogEventAsync(
            "SESSION_REVOKED",
            targetUserId: userId,
            actorUserId: adminUserId,
            succeeded: true,
            ipAddress: null,
            userAgent: null,
            details: new { tokenId },
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<int> RevokeAllSessionsAsync(long userId, long adminUserId, CancellationToken cancellationToken = default)
    {
        var tokens = await _context.UserRefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var token in tokens)
        {
            token.RevokedAt = DateTime.UtcNow;
            token.ReasonRevoked = RevokeReason.RevokedByAdmin;
        }

        var count = await _context.SaveChangesAsync(cancellationToken);

        await _securityEventService.LogEventAsync(
            "SESSION_REVOKED",
            targetUserId: userId,
            actorUserId: adminUserId,
            succeeded: true,
            ipAddress: null,
            userAgent: null,
            details: new { revokedCount = tokens.Count, scope = "ALL_SESSIONS" },
            cancellationToken: cancellationToken);

        return tokens.Count;
    }
}
