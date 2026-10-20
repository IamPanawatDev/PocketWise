using PocketWise.Application.Features.Notifications.DTOs;

namespace PocketWise.Application.Interfaces;

public interface INotificationSender
{
    Task SendNotificationToUserAsync(long userId, NotificationResponse notification, CancellationToken cancellationToken = default);
    Task SendRefreshHintToUserAsync(long userId, RefreshHintPayload hint, CancellationToken cancellationToken = default);
}
