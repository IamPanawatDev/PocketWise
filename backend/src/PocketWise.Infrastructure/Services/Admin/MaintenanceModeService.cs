using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Services.Admin;

public class MaintenanceModeService : IMaintenanceModeService
{
    private readonly PocketWiseDbContext _context;
    private readonly ISecurityEventService _securityEventService;
    private readonly ILogger<MaintenanceModeService> _logger;

    private static volatile bool _cachedIsEnabled;
    private static volatile string _cachedMessage = "ระบบกำลังอยู่ระหว่างปรับปรุงประสิทธิภาพ กรุณากลับมาใหม่อีกครั้งในภายหลัง";
    private static volatile HashSet<long> _cachedAllowedUserIds = [];
    private static DateTime? _cachedStartsAt;
    private static DateTime? _cachedEndsAt;
    private static DateTime _lastCacheRefresh = DateTime.MinValue;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(15);
    private static readonly SemaphoreSlim CacheLock = new(1, 1);

    public MaintenanceModeService(
        PocketWiseDbContext context,
        ISecurityEventService securityEventService,
        ILogger<MaintenanceModeService> logger)
    {
        _context = context;
        _securityEventService = securityEventService;
        _logger = logger;
    }

    public async Task<MaintenanceStatusResponse> GetStatusAsync(CancellationToken cancellationToken = default)
    {
        await RefreshCacheIfNeededAsync(force: false, cancellationToken);

        return new MaintenanceStatusResponse
        {
            IsEnabled = _cachedIsEnabled,
            Message = _cachedMessage,
            AllowedUserIds = _cachedAllowedUserIds.ToList(),
            StartsAt = _cachedStartsAt,
            EndsAt = _cachedEndsAt
        };
    }

    public async Task<MaintenanceStatusResponse> UpdateStatusAsync(
        long adminUserId,
        UpdateMaintenanceRequest request,
        CancellationToken cancellationToken = default)
    {
        var settings = await _context.SystemSettings
            .Where(s => s.SettingKey.StartsWith("Maintenance:"))
            .ToListAsync(cancellationToken);

        void SetSetting(string key, string value, string description)
        {
            var item = settings.FirstOrDefault(s => s.SettingKey == key);
            if (item == null)
            {
                _context.SystemSettings.Add(new SystemSetting
                {
                    SettingKey = key,
                    SettingValue = value,
                    Description = description,
                    UpdatedAt = DateTime.UtcNow,
                    UpdatedByUserId = adminUserId
                });
            }
            else
            {
                item.SettingValue = value;
                item.UpdatedAt = DateTime.UtcNow;
                item.UpdatedByUserId = adminUserId;
            }
        }

        SetSetting("Maintenance:Enabled", request.IsEnabled ? "true" : "false", "เปิด/ปิด โหมดปรับปรุงระบบ (Maintenance Mode)");
        if (!string.IsNullOrWhiteSpace(request.Message))
        {
            SetSetting("Maintenance:Message", request.Message.Trim(), "ข้อความแจ้งเตือนผู้ใช้งานเมื่ออยู่ในโหมดปรับปรุงระบบ");
        }

        var allowedIdsStr = request.AllowedUserIds != null ? string.Join(",", request.AllowedUserIds) : "";
        SetSetting("Maintenance:AllowedUserIds", allowedIdsStr, "รหัสผู้ใช้ที่ได้รับอนุญาตให้เข้าใช้งานได้ระหว่างปรับปรุงระบบ");

        SetSetting("Maintenance:StartsAt", request.StartsAt.HasValue ? request.StartsAt.Value.ToUniversalTime().ToString("O") : "", "เวลาเริ่มต้นการปรับปรุงระบบ");
        SetSetting("Maintenance:EndsAt", request.EndsAt.HasValue ? request.EndsAt.Value.ToUniversalTime().ToString("O") : "", "เวลาสิ้นสุดการปรับปรุงระบบโดยประมาณ");

        await _context.SaveChangesAsync(cancellationToken);

        await RefreshCacheIfNeededAsync(force: true, cancellationToken);

        await _securityEventService.LogEventAsync(
            "MAINTENANCE_MODE_UPDATED",
            targetUserId: null,
            actorUserId: adminUserId,
            succeeded: true,
            ipAddress: null,
            userAgent: null,
            details: new { isEnabled = request.IsEnabled, message = request.Message },
            cancellationToken: cancellationToken);

        return await GetStatusAsync(cancellationToken);
    }

    public async Task<bool> IsMaintenanceActiveAsync(CancellationToken cancellationToken = default)
    {
        await RefreshCacheIfNeededAsync(force: false, cancellationToken);

        if (!_cachedIsEnabled) return false;

        var now = DateTime.UtcNow;
        if (_cachedStartsAt.HasValue && now < _cachedStartsAt.Value) return false;
        if (_cachedEndsAt.HasValue && now > _cachedEndsAt.Value) return false;

        return true;
    }

    public async Task<bool> IsUserAllowedAsync(long? userId, CancellationToken cancellationToken = default)
    {
        if (!userId.HasValue) return false;
        await RefreshCacheIfNeededAsync(force: false, cancellationToken);

        return _cachedAllowedUserIds.Contains(userId.Value);
    }

    private async Task RefreshCacheIfNeededAsync(bool force, CancellationToken cancellationToken)
    {
        if (!force && DateTime.UtcNow - _lastCacheRefresh < CacheTtl)
        {
            return;
        }

        await CacheLock.WaitAsync(cancellationToken);
        try
        {
            if (!force && DateTime.UtcNow - _lastCacheRefresh < CacheTtl)
            {
                return;
            }

            var settings = await _context.SystemSettings
                .Where(s => s.SettingKey.StartsWith("Maintenance:"))
                .AsNoTracking()
                .ToDictionaryAsync(s => s.SettingKey, s => s.SettingValue, cancellationToken);

            _cachedIsEnabled = settings.TryGetValue("Maintenance:Enabled", out var enabledStr) &&
                               bool.TryParse(enabledStr, out var enabled) && enabled;

            if (settings.TryGetValue("Maintenance:Message", out var msg) && !string.IsNullOrWhiteSpace(msg))
            {
                _cachedMessage = msg;
            }

            if (settings.TryGetValue("Maintenance:AllowedUserIds", out var idsStr) && !string.IsNullOrWhiteSpace(idsStr))
            {
                var parsedIds = idsStr.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(id => long.TryParse(id, out var val) ? val : 0)
                    .Where(id => id > 0)
                    .ToHashSet();
                _cachedAllowedUserIds = parsedIds;
            }
            else
            {
                _cachedAllowedUserIds = [];
            }

            if (settings.TryGetValue("Maintenance:StartsAt", out var startsStr) && DateTime.TryParse(startsStr, out var starts))
            {
                _cachedStartsAt = starts.ToUniversalTime();
            }
            else
            {
                _cachedStartsAt = null;
            }

            if (settings.TryGetValue("Maintenance:EndsAt", out var endsStr) && DateTime.TryParse(endsStr, out var ends))
            {
                _cachedEndsAt = ends.ToUniversalTime();
            }
            else
            {
                _cachedEndsAt = null;
            }

            _lastCacheRefresh = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to refresh maintenance mode settings cache.");
        }
        finally
        {
            CacheLock.Release();
        }
    }
}
