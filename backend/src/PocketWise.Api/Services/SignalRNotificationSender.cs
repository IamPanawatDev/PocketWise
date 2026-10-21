using Microsoft.AspNetCore.SignalR;
using PocketWise.Api.Hubs;
using PocketWise.Application.Features.Notifications.DTOs;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Services;

public class SignalRNotificationSender : INotificationSender
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<SignalRNotificationSender> _logger;

    public SignalRNotificationSender(
        IHubContext<NotificationHub> hubContext,
        ILogger<SignalRNotificationSender> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task SendNotificationToUserAsync(
        long userId,
        NotificationResponse notification,
        CancellationToken cancellationToken = default)
    {
        var groupName = $"user_{userId}";
        _logger.LogInformation("Broadcasting ReceiveNotification to group {Group} for notification {NotificationId}", groupName, notification.NotificationId);
        await _hubContext.Clients.Group(groupName).SendAsync("ReceiveNotification", notification, cancellationToken);
    }

    public async Task SendRefreshHintToUserAsync(
        long userId,
        RefreshHintPayload hint,
        CancellationToken cancellationToken = default)
    {
        var groupName = $"user_{userId}";
        _logger.LogInformation("Broadcasting ReceiveRefreshHint to group {Group} for entity {EntityType}", groupName, hint.EntityType);
        await _hubContext.Clients.Group(groupName).SendAsync("ReceiveRefreshHint", hint, cancellationToken);
    }
}
