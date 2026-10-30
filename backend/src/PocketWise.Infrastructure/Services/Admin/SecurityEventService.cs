using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PocketWise.Application.Common;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Services.Admin;

public class SecurityEventService : ISecurityEventService
{
    private readonly PocketWiseDbContext _context;
    private readonly ILogger<SecurityEventService> _logger;

    public SecurityEventService(PocketWiseDbContext context, ILogger<SecurityEventService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task LogEventAsync(
        string eventType,
        long? targetUserId,
        long? actorUserId,
        bool succeeded,
        string? ipAddress,
        string? userAgent,
        object? details = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            string? detailsJson = null;
            if (details != null)
            {
                detailsJson = details is string str ? str : JsonSerializer.Serialize(details);
            }

            var securityEvent = new SecurityEvent
            {
                EventType = eventType,
                TargetUserId = targetUserId,
                ActorUserId = actorUserId,
                Succeeded = succeeded,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                DetailsJson = detailsJson,
                OccurredAt = DateTime.UtcNow
            };

            _context.SecurityEvents.Add(securityEvent);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log security event {EventType} for user {UserId}", eventType, targetUserId);
        }
    }

    public async Task<PagedResult<SecurityEventResponse>> GetEventsPagedAsync(
        SecurityEventFilterRequest filter,
        bool maskIp = false,
        CancellationToken cancellationToken = default)
    {
        var query = _context.SecurityEvents
            .Include(e => e.TargetUser)
            .Include(e => e.ActorUser)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.EventType))
        {
            query = query.Where(e => e.EventType == filter.EventType);
        }

        if (filter.TargetUserId.HasValue)
        {
            query = query.Where(e => e.TargetUserId == filter.TargetUserId.Value);
        }

        if (filter.ActorUserId.HasValue)
        {
            query = query.Where(e => e.ActorUserId == filter.ActorUserId.Value);
        }

        if (filter.Succeeded.HasValue)
        {
            query = query.Where(e => e.Succeeded == filter.Succeeded.Value);
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(e => e.OccurredAt >= filter.FromDate.Value.ToUniversalTime());
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(e => e.OccurredAt <= filter.ToDate.Value.ToUniversalTime());
        }

        if (!string.IsNullOrWhiteSpace(filter.Q))
        {
            var search = filter.Q.Trim().ToLower();
            query = query.Where(e =>
                (e.IpAddress != null && e.IpAddress.ToLower().Contains(search)) ||
                (e.UserAgent != null && e.UserAgent.ToLower().Contains(search)) ||
                (e.TargetUser != null && (e.TargetUser.Email != null && e.TargetUser.Email.ToLower().Contains(search) || e.TargetUser.DisplayName.ToLower().Contains(search))) ||
                (e.ActorUser != null && (e.ActorUser.Email != null && e.ActorUser.Email.ToLower().Contains(search) || e.ActorUser.DisplayName.ToLower().Contains(search))) ||
                e.EventType.ToLower().Contains(search));
        }

        var total = await query.CountAsync(cancellationToken);

        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);

        var items = await query
            .OrderByDescending(e => e.OccurredAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new SecurityEventResponse
            {
                SecurityEventId = e.SecurityEventId,
                EventType = e.EventType,
                TargetUserId = e.TargetUserId,
                TargetUserEmail = e.TargetUser != null ? e.TargetUser.Email : null,
                TargetUserDisplayName = e.TargetUser != null ? e.TargetUser.DisplayName : null,
                ActorUserId = e.ActorUserId,
                ActorUserDisplayName = e.ActorUser != null ? e.ActorUser.DisplayName : null,
                Succeeded = e.Succeeded,
                IpAddress = e.IpAddress,
                UserAgent = e.UserAgent,
                DetailsJson = e.DetailsJson,
                OccurredAt = e.OccurredAt
            })
            .ToListAsync(cancellationToken);

        if (maskIp)
        {
            foreach (var item in items)
            {
                item.IpAddress = IpAddressHelper.Mask(item.IpAddress);
            }
        }

        return new PagedResult<SecurityEventResponse>(items, page, pageSize, total);
    }
}
