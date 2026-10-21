using PocketWise.Application.DTOs;
using PocketWise.Application.Features.Notifications;
using PocketWise.Application.Features.Notifications.DTOs;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.UnitTests;

public class NotificationServiceTests
{
    private class FakeNotificationRepository : INotificationRepository
    {
        public List<Notification> Notifications { get; } = new();
        public bool SaveChangesCalled { get; private set; }

        public Task<PagedResult<Notification>> GetPagedAsync(
            long userId,
            int page,
            int pageSize,
            bool unreadOnly,
            CancellationToken cancellationToken = default)
        {
            var query = Notifications.Where(n => n.UserId == userId);
            if (unreadOnly)
            {
                query = query.Where(n => n.ReadAt == null && n.Status != NotificationStatus.Read);
            }

            var items = query.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            var total = query.Count();

            return Task.FromResult(new PagedResult<Notification>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = total,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            });
        }

        public Task<int> GetUnreadCountAsync(long userId, CancellationToken cancellationToken = default)
        {
            var count = Notifications.Count(n => n.UserId == userId && n.ReadAt == null && n.Status != NotificationStatus.Read);
            return Task.FromResult(count);
        }

        public Task<Notification?> GetByIdAsync(long userId, long notificationId, CancellationToken cancellationToken = default)
        {
            var item = Notifications.FirstOrDefault(n => n.UserId == userId && n.NotificationId == notificationId);
            return Task.FromResult(item);
        }

        public Task AddAsync(Notification notification, CancellationToken cancellationToken = default)
        {
            notification.NotificationId = Notifications.Count + 1;
            Notifications.Add(notification);
            return Task.CompletedTask;
        }

        public Task<bool> MarkAsReadAsync(long userId, long notificationId, DateTime readAt, CancellationToken cancellationToken = default)
        {
            var item = Notifications.FirstOrDefault(n => n.UserId == userId && n.NotificationId == notificationId);
            if (item == null) return Task.FromResult(false);
            item.Status = NotificationStatus.Read;
            item.ReadAt = readAt;
            return Task.FromResult(true);
        }

        public Task<int> MarkAllAsReadAsync(long userId, DateTime readAt, CancellationToken cancellationToken = default)
        {
            var items = Notifications.Where(n => n.UserId == userId && n.ReadAt == null && n.Status != NotificationStatus.Read).ToList();
            foreach (var item in items)
            {
                item.Status = NotificationStatus.Read;
                item.ReadAt = readAt;
            }
            return Task.FromResult(items.Count);
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveChangesCalled = true;
            return Task.CompletedTask;
        }
    }

    private class FakeNotificationSender : INotificationSender
    {
        public List<(long UserId, NotificationResponse Notification)> SentNotifications { get; } = new();
        public List<(long UserId, RefreshHintPayload Hint)> SentHints { get; } = new();

        public Task SendNotificationToUserAsync(long userId, NotificationResponse notification, CancellationToken cancellationToken = default)
        {
            SentNotifications.Add((userId, notification));
            return Task.CompletedTask;
        }

        public Task SendRefreshHintToUserAsync(long userId, RefreshHintPayload hint, CancellationToken cancellationToken = default)
        {
            SentHints.Add((userId, hint));
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task GetNotificationsAsync_ShouldReturnPagedResultsAndMapFields()
    {
        var repo = new FakeNotificationRepository();
        var sender = new FakeNotificationSender();
        var service = new NotificationService(repo, sender);

        repo.Notifications.Add(new Notification
        {
            NotificationId = 1,
            UserId = 10,
            Title = "Alert 1",
            Message = "Msg 1",
            Channel = NotificationChannel.InApp,
            Status = NotificationStatus.Sent,
            NotificationType = "BUDGET_WARNING",
            CreatedAt = DateTime.UtcNow
        });

        var result = await service.GetNotificationsAsync(10, 1, 10, false);

        Assert.Equal(1, result.TotalItems);
        Assert.Single(result.Items);
        Assert.Equal("Alert 1", result.Items[0].Title);
        Assert.Equal("inApp", result.Items[0].Channel);
        Assert.Equal("sent", result.Items[0].Status);
    }

    [Fact]
    public async Task GetUnreadCountAsync_ShouldReturnCorrectCount()
    {
        var repo = new FakeNotificationRepository();
        var sender = new FakeNotificationSender();
        var service = new NotificationService(repo, sender);

        repo.Notifications.Add(new Notification { NotificationId = 1, UserId = 10, Status = NotificationStatus.Sent });
        repo.Notifications.Add(new Notification { NotificationId = 2, UserId = 10, Status = NotificationStatus.Read, ReadAt = DateTime.UtcNow });
        repo.Notifications.Add(new Notification { NotificationId = 3, UserId = 20, Status = NotificationStatus.Sent });

        var count = await service.GetUnreadCountAsync(10);

        Assert.Equal(1, count.UnreadCount);
    }

    [Fact]
    public async Task MarkAsReadAsync_ShouldUpdateStatusAndReadAt()
    {
        var repo = new FakeNotificationRepository();
        var sender = new FakeNotificationSender();
        var service = new NotificationService(repo, sender);

        repo.Notifications.Add(new Notification { NotificationId = 5, UserId = 10, Status = NotificationStatus.Sent });

        var res = await service.MarkAsReadAsync(10, 5);

        Assert.Equal("read", res.Status);
        Assert.NotNull(res.ReadAt);
        Assert.True(repo.SaveChangesCalled);
    }

    [Fact]
    public async Task MarkAsReadAsync_WhenNotFound_ThrowsBusinessException()
    {
        var repo = new FakeNotificationRepository();
        var sender = new FakeNotificationSender();
        var service = new NotificationService(repo, sender);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.MarkAsReadAsync(10, 999));
        Assert.Equal("NOT_FOUND", ex.Code);
    }

    [Fact]
    public async Task MarkAllAsReadAsync_ShouldMarkAllUnreadAndReturnCount()
    {
        var repo = new FakeNotificationRepository();
        var sender = new FakeNotificationSender();
        var service = new NotificationService(repo, sender);

        repo.Notifications.Add(new Notification { NotificationId = 1, UserId = 10, Status = NotificationStatus.Sent });
        repo.Notifications.Add(new Notification { NotificationId = 2, UserId = 10, Status = NotificationStatus.Sent });

        var res = await service.MarkAllAsReadAsync(10);

        Assert.Equal(2, res.Count);
        Assert.All(repo.Notifications, n => Assert.Equal(NotificationStatus.Read, n.Status));
        Assert.True(repo.SaveChangesCalled);
    }

    [Fact]
    public async Task CreateAndSendAsync_ShouldSaveAndBroadcastViaSender()
    {
        var repo = new FakeNotificationRepository();
        var sender = new FakeNotificationSender();
        var service = new NotificationService(repo, sender);

        var notification = new Notification
        {
            UserId = 10,
            Title = "Real-time alert",
            Message = "Budget 90%",
            Channel = NotificationChannel.InApp,
            NotificationType = "BUDGET_WARNING"
        };

        var res = await service.CreateAndSendAsync(notification);

        Assert.Equal(1, res.NotificationId);
        Assert.Equal("Real-time alert", res.Title);
        Assert.True(repo.SaveChangesCalled);
        Assert.Single(sender.SentNotifications);
        Assert.Equal(10, sender.SentNotifications[0].UserId);
        Assert.Equal("Real-time alert", sender.SentNotifications[0].Notification.Title);
    }
}
