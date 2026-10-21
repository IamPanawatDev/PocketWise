using PocketWise.Application.DTOs;
using PocketWise.Application.Features.Notifications.DTOs;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.Notifications;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;
    private readonly INotificationSender _notificationSender;

    public NotificationService(
        INotificationRepository repository,
        INotificationSender notificationSender)
    {
        _repository = repository;
        _notificationSender = notificationSender;
    }

    public async Task<PagedResult<NotificationResponse>> GetNotificationsAsync(
        long userId,
        int page,
        int pageSize,
        bool unreadOnly,
        CancellationToken cancellationToken = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var paged = await _repository.GetPagedAsync(userId, page, pageSize, unreadOnly, cancellationToken);

        return new PagedResult<NotificationResponse>
        {
            Items = paged.Items.Select(MapToResponse).ToList(),
            Page = paged.Page,
            PageSize = paged.PageSize,
            TotalItems = paged.TotalItems,
            TotalPages = paged.TotalPages
        };
    }

    public async Task<NotificationUnreadCountResponse> GetUnreadCountAsync(
        long userId,
        CancellationToken cancellationToken = default)
    {
        var count = await _repository.GetUnreadCountAsync(userId, cancellationToken);
        return new NotificationUnreadCountResponse { UnreadCount = count };
    }

    public async Task<NotificationResponse> MarkAsReadAsync(
        long userId,
        long notificationId,
        CancellationToken cancellationToken = default)
    {
        var notification = await _repository.GetByIdAsync(userId, notificationId, cancellationToken);
        if (notification == null)
        {
            throw new BusinessException("NOT_FOUND", "ไม่พบการแจ้งเตือนที่ระบุ");
        }

        notification.Status = NotificationStatus.Read;
        notification.ReadAt = DateTime.UtcNow;

        await _repository.SaveChangesAsync(cancellationToken);

        return MapToResponse(notification);
    }

    public async Task<BatchReadNotificationsResponse> MarkAllAsReadAsync(
        long userId,
        CancellationToken cancellationToken = default)
    {
        var count = await _repository.MarkAllAsReadAsync(userId, DateTime.UtcNow, cancellationToken);
        if (count > 0)
        {
            await _repository.SaveChangesAsync(cancellationToken);
        }

        return new BatchReadNotificationsResponse { Count = count };
    }

    public async Task<NotificationResponse> CreateAndSendAsync(
        Notification notification,
        CancellationToken cancellationToken = default)
    {
        notification.Status = NotificationStatus.Sent;
        notification.SentAt = DateTime.UtcNow;
        notification.CreatedAt = DateTime.UtcNow;

        await _repository.AddAsync(notification, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        var response = MapToResponse(notification);
        await _notificationSender.SendNotificationToUserAsync(notification.UserId, response, cancellationToken);

        return response;
    }

    public static NotificationResponse MapToResponse(Notification n)
    {
        return new NotificationResponse
        {
            NotificationId = n.NotificationId,
            NotificationType = n.NotificationType,
            Title = n.Title,
            Message = n.Message,
            Channel = n.Channel switch
            {
                NotificationChannel.InApp => "inApp",
                NotificationChannel.Email => "email",
                _ => n.Channel.ToString().ToLowerInvariant()
            },
            Status = n.Status switch
            {
                NotificationStatus.Pending => "pending",
                NotificationStatus.Sent => "sent",
                NotificationStatus.Failed => "failed",
                NotificationStatus.Read => "read",
                _ => n.Status.ToString().ToLowerInvariant()
            },
            RelatedEntityType = n.RelatedEntityType,
            RelatedEntityId = n.RelatedEntityId,
            SentAt = n.SentAt,
            ReadAt = n.ReadAt,
            CreatedAt = n.CreatedAt
        };
    }
}
