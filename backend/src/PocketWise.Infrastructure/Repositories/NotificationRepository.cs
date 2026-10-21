using Microsoft.EntityFrameworkCore;
using PocketWise.Application.DTOs;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly PocketWiseDbContext _dbContext;

    public NotificationRepository(PocketWiseDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PagedResult<Notification>> GetPagedAsync(
        long userId,
        int page,
        int pageSize,
        bool unreadOnly,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (unreadOnly)
        {
            query = query.Where(n => n.ReadAt == null && n.Status != NotificationStatus.Read);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Notification>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = totalPages
        };
    }

    public async Task<int> GetUnreadCountAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId && n.ReadAt == null && n.Status != NotificationStatus.Read)
            .CountAsync(cancellationToken);
    }

    public async Task<Notification?> GetByIdAsync(long userId, long notificationId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Notifications
            .FirstOrDefaultAsync(n => n.UserId == userId && n.NotificationId == notificationId, cancellationToken);
    }

    public async Task AddAsync(Notification notification, CancellationToken cancellationToken = default)
    {
        await _dbContext.Notifications.AddAsync(notification, cancellationToken);
    }

    public async Task<bool> MarkAsReadAsync(long userId, long notificationId, DateTime readAt, CancellationToken cancellationToken = default)
    {
        var notification = await GetByIdAsync(userId, notificationId, cancellationToken);
        if (notification == null) return false;

        notification.Status = NotificationStatus.Read;
        notification.ReadAt = readAt;
        return true;
    }

    public async Task<int> MarkAllAsReadAsync(long userId, DateTime readAt, CancellationToken cancellationToken = default)
    {
        var unreadNotifications = await _dbContext.Notifications
            .Where(n => n.UserId == userId && n.ReadAt == null && n.Status != NotificationStatus.Read)
            .ToListAsync(cancellationToken);

        foreach (var item in unreadNotifications)
        {
            item.Status = NotificationStatus.Read;
            item.ReadAt = readAt;
        }

        return unreadNotifications.Count;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
