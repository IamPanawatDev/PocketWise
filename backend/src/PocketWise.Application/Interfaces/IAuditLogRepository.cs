using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.AuditLogs;
using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface IAuditLogRepository
{
    Task AddAsync(AuditLog log, CancellationToken cancellationToken = default);
    Task<PagedResult<AuditLog>> GetPagedAsync(
        long? userId,
        AuditLogFilter filter,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
    Task<AuditLog?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetEntityTypesAsync(long? userId, CancellationToken cancellationToken = default);
}
