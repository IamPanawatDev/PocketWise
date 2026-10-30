using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Admin;

namespace PocketWise.Application.Interfaces;

public interface ISecurityEventService
{
    Task LogEventAsync(
        string eventType,
        long? targetUserId,
        long? actorUserId,
        bool succeeded,
        string? ipAddress,
        string? userAgent,
        object? details = null,
        CancellationToken cancellationToken = default);

    Task<PagedResult<SecurityEventResponse>> GetEventsPagedAsync(
        SecurityEventFilterRequest filter,
        bool maskIp = false,
        CancellationToken cancellationToken = default);
}

public interface IAdminUserService
{
    Task<PagedResult<AdminUserListItemResponse>> GetUsersPagedAsync(
        string? q,
        string? role,
        bool? isSuspended,
        bool? isEmailVerified,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<AdminUserDetailResponse?> GetUserDetailAsync(long userId, CancellationToken cancellationToken = default);

    Task<bool> SuspendUserAsync(long userId, long adminUserId, string reason, CancellationToken cancellationToken = default);

    Task<bool> UnsuspendUserAsync(long userId, long adminUserId, CancellationToken cancellationToken = default);

    Task<bool> ResendVerificationEmailAsync(long userId, CancellationToken cancellationToken = default);

    Task<string?> SendPasswordResetLinkAsync(long userId, CancellationToken cancellationToken = default);

    Task<List<AdminUserSessionResponse>> GetUserSessionsAsync(long userId, long? currentSessionId, CancellationToken cancellationToken = default);

    Task<bool> RevokeSessionAsync(long userId, long tokenId, long adminUserId, CancellationToken cancellationToken = default);

    Task<int> RevokeAllSessionsAsync(long userId, long adminUserId, CancellationToken cancellationToken = default);
}

public interface IAdminImportJobService
{
    Task<PagedResult<AdminImportJobListResponse>> GetImportJobsPagedAsync(
        AdminImportJobFilterRequest filter,
        CancellationToken cancellationToken = default);

    Task<bool> RetryImportJobAsync(long jobId, long adminUserId, CancellationToken cancellationToken = default);

    Task<bool> CancelImportJobAsync(long jobId, long adminUserId, CancellationToken cancellationToken = default);
}

public interface IAnnouncementService
{
    Task<List<AnnouncementResponse>> GetAllAnnouncementsAsync(CancellationToken cancellationToken = default);

    Task<AnnouncementResponse?> GetAnnouncementByIdAsync(long id, CancellationToken cancellationToken = default);

    Task<AnnouncementResponse> CreateAnnouncementAsync(long adminUserId, CreateAnnouncementRequest request, CancellationToken cancellationToken = default);

    Task<AnnouncementResponse?> UpdateAnnouncementAsync(long id, long adminUserId, UpdateAnnouncementRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAnnouncementAsync(long id, long adminUserId, CancellationToken cancellationToken = default);

    Task<List<UserAnnouncementResponse>> GetActiveAnnouncementsForUserAsync(long? userId, CancellationToken cancellationToken = default);
}

public interface IMaintenanceModeService
{
    Task<MaintenanceStatusResponse> GetStatusAsync(CancellationToken cancellationToken = default);

    Task<MaintenanceStatusResponse> UpdateStatusAsync(long adminUserId, UpdateMaintenanceRequest request, CancellationToken cancellationToken = default);

    Task<bool> IsMaintenanceActiveAsync(CancellationToken cancellationToken = default);

    Task<bool> IsUserAllowedAsync(long? userId, CancellationToken cancellationToken = default);
}

public interface IAdminSystemSettingsService
{
    Task<List<SystemSettingResponse>> GetAllSettingsAsync(CancellationToken cancellationToken = default);

    Task<SystemSettingResponse?> UpdateSettingAsync(string key, string value, long adminUserId, CancellationToken cancellationToken = default);
}

public interface IAdminDashboardService
{
    Task<AdminDashboardOverviewResponse> GetOverviewAsync(CancellationToken cancellationToken = default);
}
