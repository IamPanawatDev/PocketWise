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
    private readonly ILogger<AuditLogService> _logger;

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

    public AuditLogService(IAuditLogRepository repository, ILogger<AuditLogService> logger)
    {
        _repository = repository;
        _logger = logger;
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

    private static string SanitizeJson(string json)
    {
        try
        {
            var node = JsonNode.Parse(json);
            if (node is JsonObject obj)
            {
                SanitizeObject(obj);
                return obj.ToJsonString(JsonOptions);
            }
            return json;
        }
        catch
        {
            return json;
        }
    }

    private static void SanitizeObject(JsonObject obj)
    {
        var keysToMask = new List<string>();
        foreach (var kvp in obj)
        {
            if (SensitiveKeys.Contains(kvp.Key))
            {
                keysToMask.Add(kvp.Key);
            }
            else if (kvp.Value is JsonObject childObj)
            {
                SanitizeObject(childObj);
            }
            else if (kvp.Value is JsonArray arr)
            {
                foreach (var item in arr)
                {
                    if (item is JsonObject arrObj)
                    {
                        SanitizeObject(arrObj);
                    }
                }
            }
        }

        foreach (var key in keysToMask)
        {
            obj[key] = "***MASKED***";
        }
    }
}
