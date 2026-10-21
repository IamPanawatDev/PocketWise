using PocketWise.Application.DTOs;
using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface INotificationRepository
{
    Task<PagedResult<Notification>> GetPagedAsync(
        long userId,
        int page,
        int pageSize,
        bool unreadOnly,
        CancellationToken cancellationToken = default);

    Task<int> GetUnreadCountAsync(long userId, CancellationToken cancellationToken = default);

    Task<Notification?> GetByIdAsync(long userId, long notificationId, CancellationToken cancellationToken = default);

    Task AddAsync(Notification notification, CancellationToken cancellationToken = default);

    Task<bool> MarkAsReadAsync(long userId, long notificationId, DateTime readAt, CancellationToken cancellationToken = default);

    Task<int> MarkAllAsReadAsync(long userId, DateTime readAt, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
