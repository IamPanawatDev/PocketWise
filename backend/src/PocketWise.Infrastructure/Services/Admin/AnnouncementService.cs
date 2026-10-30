using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Services.Admin;

public class AnnouncementService : IAnnouncementService
{
    private readonly PocketWiseDbContext _context;
    private readonly ILogger<AnnouncementService> _logger;

    public AnnouncementService(PocketWiseDbContext context, ILogger<AnnouncementService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<AnnouncementResponse>> GetAllAnnouncementsAsync(CancellationToken cancellationToken = default)
    {
        var items = await _context.Announcements
            .Include(a => a.CreatedByUser)
            .Include(a => a.Targets)
                .ThenInclude(t => t.Role)
            .Include(a => a.Targets)
                .ThenInclude(t => t.User)
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        return items.Select(MapToResponse).ToList();
    }

    public async Task<AnnouncementResponse?> GetAnnouncementByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await _context.Announcements
            .Include(a => a.CreatedByUser)
            .Include(a => a.Targets)
                .ThenInclude(t => t.Role)
            .Include(a => a.Targets)
                .ThenInclude(t => t.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.AnnouncementId == id, cancellationToken);

        return item == null ? null : MapToResponse(item);
    }

    public async Task<AnnouncementResponse> CreateAnnouncementAsync(
        long adminUserId,
        CreateAnnouncementRequest request,
        CancellationToken cancellationToken = default)
    {
        var announcement = new Announcement
        {
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            StartsAt = request.StartsAt.ToUniversalTime(),
            EndsAt = request.EndsAt.ToUniversalTime(),
            IsActive = request.IsActive,
            CreatedByUserId = adminUserId,
            CreatedAt = DateTime.UtcNow,
            Targets = request.Targets.Select(t => new AnnouncementTarget
            {
                TargetType = t.TargetType,
                RoleId = t.RoleId,
                UserId = t.UserId,
                CreatedAt = DateTime.UtcNow
            }).ToList()
        };

        _context.Announcements.Add(announcement);
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetAnnouncementByIdAsync(announcement.AnnouncementId, cancellationToken))!;
    }

    public async Task<AnnouncementResponse?> UpdateAnnouncementAsync(
        long id,
        long adminUserId,
        UpdateAnnouncementRequest request,
        CancellationToken cancellationToken = default)
    {
        var announcement = await _context.Announcements
            .Include(a => a.Targets)
            .FirstOrDefaultAsync(a => a.AnnouncementId == id, cancellationToken);

        if (announcement == null) return null;

        announcement.Title = request.Title.Trim();
        announcement.Message = request.Message.Trim();
        announcement.StartsAt = request.StartsAt.ToUniversalTime();
        announcement.EndsAt = request.EndsAt.ToUniversalTime();
        announcement.IsActive = request.IsActive;
        announcement.UpdatedAt = DateTime.UtcNow;

        // Replace targets
        _context.AnnouncementTargets.RemoveRange(announcement.Targets);
        announcement.Targets = request.Targets.Select(t => new AnnouncementTarget
        {
            AnnouncementId = announcement.AnnouncementId,
            TargetType = t.TargetType,
            RoleId = t.RoleId,
            UserId = t.UserId,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        await _context.SaveChangesAsync(cancellationToken);

        return await GetAnnouncementByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteAnnouncementAsync(long id, long adminUserId, CancellationToken cancellationToken = default)
    {
        var announcement = await _context.Announcements.FirstOrDefaultAsync(a => a.AnnouncementId == id, cancellationToken);
        if (announcement == null) return false;

        _context.Announcements.Remove(announcement);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<List<UserAnnouncementResponse>> GetActiveAnnouncementsForUserAsync(
        long? userId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        var activeAnnouncements = await _context.Announcements
            .Include(a => a.Targets)
            .AsNoTracking()
            .Where(a => a.IsActive && a.StartsAt <= now && a.EndsAt >= now)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        if (!activeAnnouncements.Any())
        {
            return [];
        }

        if (!userId.HasValue)
        {
            // Anonymous user -> only "All" target
            return activeAnnouncements
                .Where(a => !a.Targets.Any() || a.Targets.Any(t => t.TargetType == "All"))
                .Select(a => new UserAnnouncementResponse
                {
                    AnnouncementId = a.AnnouncementId,
                    Title = a.Title,
                    Message = a.Message,
                    StartsAt = a.StartsAt,
                    EndsAt = a.EndsAt
                })
                .ToList();
        }

        // Authenticated user
        var uid = userId.Value;
        var user = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == uid)
            .Select(u => new { u.IsEmailVerified })
            .FirstOrDefaultAsync(cancellationToken);

        var userRoleIds = await _context.UserRoles
            .Where(ur => ur.UserId == uid)
            .Select(ur => ur.RoleId)
            .ToListAsync(cancellationToken);

        var matched = activeAnnouncements.Where(a =>
        {
            if (!a.Targets.Any()) return true; // Default to all if no targets specified

            return a.Targets.Any(t =>
                t.TargetType == "All" ||
                (t.TargetType == "Role" && t.RoleId.HasValue && userRoleIds.Contains(t.RoleId.Value)) ||
                (t.TargetType == "User" && t.UserId.HasValue && t.UserId.Value == uid) ||
                (t.TargetType == "UnverifiedEmail" && user != null && !user.IsEmailVerified));
        });

        return matched.Select(a => new UserAnnouncementResponse
        {
            AnnouncementId = a.AnnouncementId,
            Title = a.Title,
            Message = a.Message,
            StartsAt = a.StartsAt,
            EndsAt = a.EndsAt
        }).ToList();
    }

    private static AnnouncementResponse MapToResponse(Announcement a)
    {
        return new AnnouncementResponse
        {
            AnnouncementId = a.AnnouncementId,
            Title = a.Title,
            Message = a.Message,
            StartsAt = a.StartsAt,
            EndsAt = a.EndsAt,
            IsActive = a.IsActive,
            CreatedByUserId = a.CreatedByUserId,
            CreatedByDisplayName = a.CreatedByUser?.DisplayName,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt,
            Targets = a.Targets.Select(t => new AnnouncementTargetResponse
            {
                AnnouncementTargetId = t.AnnouncementTargetId,
                TargetType = t.TargetType,
                RoleId = t.RoleId,
                RoleName = t.Role?.Name,
                UserId = t.UserId,
                UserEmail = t.User?.Email
            }).ToList()
        };
    }
}
