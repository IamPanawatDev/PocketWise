using PocketWise.Application.DTOs;
using PocketWise.Application.Features.Notifications.DTOs;
using PocketWise.Domain.Entities;

namespace PocketWise.Application.Features.Notifications;

public interface INotificationService
{
    Task<PagedResult<NotificationResponse>> GetNotificationsAsync(
        long userId,
        int page,
        int pageSize,
        bool unreadOnly,
        CancellationToken cancellationToken = default);

    Task<NotificationUnreadCountResponse> GetUnreadCountAsync(
        long userId,
        CancellationToken cancellationToken = default);

    Task<NotificationResponse> MarkAsReadAsync(
        long userId,
        long notificationId,
        CancellationToken cancellationToken = default);

    Task<BatchReadNotificationsResponse> MarkAllAsReadAsync(
        long userId,
        CancellationToken cancellationToken = default);

    Task<NotificationResponse> CreateAndSendAsync(
        Notification notification,
        CancellationToken cancellationToken = default);
}
