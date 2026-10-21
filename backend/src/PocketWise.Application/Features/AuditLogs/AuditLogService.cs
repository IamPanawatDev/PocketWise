using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.AuditLogs;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Application.Features.AuditLogs;

public class AuditLogService : IAuditLogService
{
    private readonly IAuditLogRepository _repository;
    private readonly ICurrentUserContext? _currentUserContext;
    private readonly ILogger<AuditLogService> _logger;

    private static volatile bool _cachedIsEnabled = true;
    private static volatile bool _hasLoadedSetting = false;
    private static readonly SemaphoreSlim SettingLock = new(1, 1);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private static readonly HashSet<string> SensitiveKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "password",
        "passwordhash",
        "confirmpassword",
        "token",
        "refreshtoken",
        "cardnumber",
        "fullcardnumber",
        "cvv",
        "secret",
        "accesstoken"
    };

    public AuditLogService(
        IAuditLogRepository repository,
        ILogger<AuditLogService> logger,
        ICurrentUserContext? currentUserContext = null)
    {
        _repository = repository;
        _logger = logger;
        _currentUserContext = currentUserContext;
    }

    public async Task LogAsync(
        long? userId,
        AuditAction action,
        string entityType,
        string? entityId,
        object? details = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Check if Audit Log recording is enabled
            if (!await IsEnabledAsync(cancellationToken))
            {
                return; // Disabled by Admin -> skip writing to avoid database bloat
            }

            // Fallback for userId: if not provided or 0, auto-resolve from CurrentUserContext
            if ((userId == null || userId <= 0) && _currentUserContext?.UserId.HasValue == true)
            {
                userId = _currentUserContext.UserId.Value;
            }

            string? detailsJson = null;
            if (details != null)
            {
                if (details is string strDetails)
                {
                    detailsJson = strDetails;
                }
                else
                {
                    var serialized = JsonSerializer.Serialize(details, JsonOptions);
                    detailsJson = SanitizeJson(serialized);
                }
            }

            var log = new AuditLog
            {
                UserId = userId,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                OccurredAt = DateTime.UtcNow,
                DetailsJson = detailsJson
            };

            await _repository.AddAsync(log, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record audit log for {Action} on {EntityType} {EntityId}", action, entityType, entityId);
        }
    }

    public async Task<PagedResult<AuditLogResponse>> GetLogsPagedAsync(
        long currentUserId,
        bool isAdmin,
        AuditLogFilter filter,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        // Enforce ownership: non-admin can only see their own logs
        long? targetUserId = isAdmin ? filter.UserId : currentUserId;

        var pagedLogs = await _repository.GetPagedAsync(targetUserId, filter, page, pageSize, cancellationToken);

        var items = pagedLogs.Items.Select(a => new AuditLogResponse
        {
            AuditLogId = a.AuditLogId,
            UserId = a.UserId,
            UserDisplayName = a.User?.DisplayName ?? a.User?.UserName,
            Action = a.Action.ToString(),
            EntityType = a.EntityType,
            EntityId = a.EntityId,
            OccurredAt = a.OccurredAt,
            DetailsJson = a.DetailsJson
        }).ToList();

        return new PagedResult<AuditLogResponse>
        {
            Items = items,
            Page = pagedLogs.Page,
            PageSize = pagedLogs.PageSize,
            TotalItems = pagedLogs.TotalItems,
            TotalPages = pagedLogs.TotalPages
        };
    }

    public async Task<AuditLogResponse?> GetLogByIdAsync(
        long id,
        long currentUserId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        var log = await _repository.GetByIdAsync(id, cancellationToken);
        if (log is null)
        {
            return null;
        }

        // Per-user authorization: non-admin can only see their own logs
        if (!isAdmin && log.UserId != currentUserId)
        {
            return null;
        }

        return new AuditLogResponse
        {
            AuditLogId = log.AuditLogId,
            UserId = log.UserId,
            UserDisplayName = log.User?.DisplayName ?? log.User?.UserName,
            Action = log.Action.ToString(),
            EntityType = log.EntityType,
            EntityId = log.EntityId,
            OccurredAt = log.OccurredAt,
            DetailsJson = log.DetailsJson
        };
    }

    public async Task<IReadOnlyList<string>> GetEntityTypesAsync(
        long currentUserId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        long? targetUserId = isAdmin ? null : currentUserId;
        return await _repository.GetEntityTypesAsync(targetUserId, cancellationToken);
    }

    public async Task<AuditLogSettingsResponse> GetSettingsAsync(CancellationToken cancellationToken = default)
    {
        var isEnabled = await _repository.IsAuditLogEnabledAsync(cancellationToken);
        _cachedIsEnabled = isEnabled;
        _hasLoadedSetting = true;

        var totalLogs = await _repository.GetTotalCountAsync(cancellationToken);
        var (oldest, latest) = await _repository.GetDateRangeAsync(cancellationToken);

        return new AuditLogSettingsResponse
        {
            IsEnabled = isEnabled,
            TotalLogs = totalLogs,
            OldestLogDate = oldest,
            LatestLogDate = latest,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public async Task SetSettingsAsync(bool enabled, long actorUserId, CancellationToken cancellationToken = default)
    {
        _cachedIsEnabled = enabled;
        _hasLoadedSetting = true;

        await _repository.SetAuditLogEnabledAsync(enabled, actorUserId, cancellationToken);

        // Always log this critical administrative action directly
        try
        {
            var log = new AuditLog
            {
                UserId = actorUserId,
                Action = AuditAction.Update,
                EntityType = "SystemSettings",
                EntityId = "AuditLog:Enabled",
                OccurredAt = DateTime.UtcNow,
                DetailsJson = JsonSerializer.Serialize(new
                {
                    Setting = "AuditLog:Enabled",
                    IsEnabled = enabled,
                    ActionDescription = enabled ? "เปิดการบันทึกประวัติการเปลี่ยนแปลง" : "ปิดการบันทึกประวัติการเปลี่ยนแปลง (ป้องกันฐานข้อมูลบวม)"
                }, JsonOptions)
            };
            await _repository.AddAsync(log, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to record audit log setting change");
        }
    }

    public async Task<PurgeAuditLogsResponse> PurgeLogsAsync(int olderThanDays, long actorUserId, CancellationToken cancellationToken = default)
    {
        DateTime? cutoffDate = olderThanDays > 0 ? DateTime.UtcNow.AddDays(-olderThanDays) : null;
        var deletedCount = await _repository.PurgeOlderThanAsync(cutoffDate, cancellationToken);

        // Log the purge event
        try
        {
            var log = new AuditLog
            {
                UserId = actorUserId,
                Action = AuditAction.Delete,
                EntityType = "AuditLogs",
                EntityId = "purge",
                OccurredAt = DateTime.UtcNow,
                DetailsJson = JsonSerializer.Serialize(new
                {
                    OlderThanDays = olderThanDays,
                    CutoffDate = cutoffDate,
                    DeletedCount = deletedCount
                }, JsonOptions)
            };
            await _repository.AddAsync(log, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to record audit log purge event");
        }

        var message = olderThanDays > 0
            ? $"ล้างประวัติที่เก่ากว่า {olderThanDays} วัน สำเร็จทั้งหมด {deletedCount:N0} รายการ"
            : $"ล้างประวัติทั้งหมดสำเร็จ {deletedCount:N0} รายการ";

        return new PurgeAuditLogsResponse
        {
            DeletedCount = deletedCount,
            Message = message
        };
    }

    private async Task<bool> IsEnabledAsync(CancellationToken cancellationToken)
    {
        if (_hasLoadedSetting)
        {
            return _cachedIsEnabled;
        }

        await SettingLock.WaitAsync(cancellationToken);
        try
        {
            if (!_hasLoadedSetting)
            {
                _cachedIsEnabled = await _repository.IsAuditLogEnabledAsync(cancellationToken);
                _hasLoadedSetting = true;
            }
            return _cachedIsEnabled;
        }
        finally
        {
            SettingLock.Release();
        }
    }

    private static string SanitizeJson(string json)
    {
        try
        {
            var node = JsonNode.Parse(json);
            if (node is null) return json;

            SanitizeNode(node);
            return node.ToJsonString(JsonOptions);
        }
        catch
        {
            return json;
        }
    }

    private static void SanitizeNode(JsonNode node)
    {
        if (node is JsonObject obj)
        {
            var keys = obj.Select(kv => kv.Key).ToList();
            foreach (var key in keys)
            {
                if (SensitiveKeys.Contains(key))
                {
                    obj[key] = "***MASKED***";
                }
                else if (obj[key] is not null)
                {
                    SanitizeNode(obj[key]!);
                }
            }
        }
        else if (node is JsonArray arr)
        {
            foreach (var item in arr)
            {
                if (item is not null)
                {
                    SanitizeNode(item);
                }
            }
        }
    }
}
