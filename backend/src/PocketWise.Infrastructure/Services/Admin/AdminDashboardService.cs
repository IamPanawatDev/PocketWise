using Microsoft.EntityFrameworkCore;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Enums;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Services.Admin;

public class AdminDashboardService : IAdminDashboardService
{
    private readonly PocketWiseDbContext _context;
    private readonly IMaintenanceModeService _maintenanceModeService;

    public AdminDashboardService(
        PocketWiseDbContext context,
        IMaintenanceModeService maintenanceModeService)
    {
        _context = context;
        _maintenanceModeService = maintenanceModeService;
    }

    public async Task<AdminDashboardOverviewResponse> GetOverviewAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var weekStart = todayStart.AddDays(-(int)now.DayOfWeek);
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var thirtyDaysAgo = now.AddDays(-30);
        var twentyFourHoursAgo = now.AddHours(-24);

        // User metrics
        var totalUsers = await _context.Users.CountAsync(cancellationToken);
        var suspendedUsers = await _context.Users.CountAsync(u => u.IsSuspended, cancellationToken);
        var unverifiedEmailUsers = await _context.Users.CountAsync(u => !u.IsEmailVerified, cancellationToken);
        var signupsToday = await _context.Users.CountAsync(u => u.CreatedAt >= todayStart, cancellationToken);
        var signupsThisWeek = await _context.Users.CountAsync(u => u.CreatedAt >= weekStart, cancellationToken);
        var signupsThisMonth = await _context.Users.CountAsync(u => u.CreatedAt >= monthStart, cancellationToken);

        // Active users (logged in within last 30 days)
        var activeUsers30Days = await _context.SecurityEvents
            .Where(e => e.OccurredAt >= thirtyDaysAgo && e.EventType == "LOGIN_SUCCEEDED" && e.TargetUserId.HasValue)
            .Select(e => e.TargetUserId!.Value)
            .Distinct()
            .CountAsync(cancellationToken);

        // If no security events yet, fall back to counting users created in last 30 days or active
        if (activeUsers30Days == 0 && totalUsers > 0)
        {
            activeUsers30Days = await _context.Users.CountAsync(u => u.IsActive && !u.IsSuspended, cancellationToken);
        }

        // Import jobs metrics
        var importJobCounts = await _context.ImportJobs
            .GroupBy(j => j.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var importSummary = new ImportJobsSummaryDto
        {
            Total = importJobCounts.Sum(x => x.Count),
            Completed = importJobCounts.FirstOrDefault(x => x.Status == ImportJobStatus.Completed)?.Count ?? 0,
            Failed = importJobCounts.FirstOrDefault(x => x.Status == ImportJobStatus.Failed)?.Count ?? 0,
            Processing = importJobCounts.FirstOrDefault(x => x.Status == ImportJobStatus.Processing)?.Count ?? 0,
            Pending = importJobCounts.FirstOrDefault(x => x.Status == ImportJobStatus.Pending)?.Count ?? 0
        };

        // Security events in last 24h
        var secEvents24h = await _context.SecurityEvents
            .Where(e => e.OccurredAt >= twentyFourHoursAgo)
            .GroupBy(e => e.EventType)
            .Select(g => new { EventType = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var secSummary = new SecurityEventsSummaryDto
        {
            Total = secEvents24h.Sum(x => x.Count),
            FailedLogins = secEvents24h.FirstOrDefault(x => x.EventType == "LOGIN_FAILED")?.Count ?? 0,
            Suspensions = secEvents24h.FirstOrDefault(x => x.EventType == "ACCOUNT_SUSPENDED")?.Count ?? 0,
            TokenReuses = secEvents24h.FirstOrDefault(x => x.EventType == "TOKEN_REUSE")?.Count ?? 0
        };

        // Maintenance status
        var maintenance = await _maintenanceModeService.GetStatusAsync(cancellationToken);

        return new AdminDashboardOverviewResponse
        {
            TotalUsers = totalUsers,
            ActiveUsers30Days = activeUsers30Days,
            SuspendedUsers = suspendedUsers,
            UnverifiedEmailUsers = unverifiedEmailUsers,
            SignupsToday = signupsToday,
            SignupsThisWeek = signupsThisWeek,
            SignupsThisMonth = signupsThisMonth,
            ImportJobsSummary = importSummary,
            SecurityEvents24Hours = secSummary,
            MaintenanceStatus = new MaintenanceStatusSummaryDto
            {
                IsEnabled = maintenance.IsEnabled,
                Message = maintenance.Message,
                StartsAt = maintenance.StartsAt,
                EndsAt = maintenance.EndsAt
            }
        };
    }
}
