using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.AuditLogs;
using PocketWise.Domain.Enums;

namespace PocketWise.Application.Interfaces;

public interface IAuditLogService
{
    Task LogAsync(
        long? userId,
        AuditAction action,
        string entityType,
        string? entityId,
        object? details = null,
        CancellationToken cancellationToken = default);

    Task<PagedResult<AuditLogResponse>> GetLogsPagedAsync(
        long currentUserId,
        bool isAdmin,
        AuditLogFilter filter,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<AuditLogResponse?> GetLogByIdAsync(
        long id,
        long currentUserId,
        bool isAdmin,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> GetEntityTypesAsync(
        long currentUserId,
        bool isAdmin,
        CancellationToken cancellationToken = default);
}
