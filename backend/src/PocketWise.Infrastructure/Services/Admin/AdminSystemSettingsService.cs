using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Services.Admin;

public class AdminSystemSettingsService : IAdminSystemSettingsService
{
    private readonly PocketWiseDbContext _context;
    private readonly ISecurityEventService _securityEventService;
    private readonly ILogger<AdminSystemSettingsService> _logger;

    public AdminSystemSettingsService(
        PocketWiseDbContext context,
        ISecurityEventService securityEventService,
        ILogger<AdminSystemSettingsService> logger)
    {
        _context = context;
        _securityEventService = securityEventService;
        _logger = logger;
    }

    public async Task<List<SystemSettingResponse>> GetAllSettingsAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _context.SystemSettings
            .AsNoTracking()
            .OrderBy(s => s.SettingKey)
            .ToListAsync(cancellationToken);

        return settings.Select(s => new SystemSettingResponse
        {
            SettingKey = s.SettingKey,
            SettingValue = s.SettingValue,
            Description = s.Description,
            UpdatedAt = s.UpdatedAt,
            UpdatedByUserId = s.UpdatedByUserId
        }).ToList();
    }

    public async Task<SystemSettingResponse?> UpdateSettingAsync(string key, string value, long adminUserId, CancellationToken cancellationToken = default)
    {
        var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey == key, cancellationToken);
        if (setting == null)
        {
            setting = new SystemSetting
            {
                SettingKey = key,
                SettingValue = value,
                UpdatedAt = DateTime.UtcNow,
                UpdatedByUserId = adminUserId
            };
            _context.SystemSettings.Add(setting);
        }
        else
        {
            setting.SettingValue = value;
            setting.UpdatedAt = DateTime.UtcNow;
            setting.UpdatedByUserId = adminUserId;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _securityEventService.LogEventAsync(
            "SYSTEM_SETTING_UPDATED",
            targetUserId: null,
            actorUserId: adminUserId,
            succeeded: true,
            ipAddress: null,
            userAgent: null,
            details: new { key, value },
            cancellationToken: cancellationToken);

        return new SystemSettingResponse
        {
            SettingKey = setting.SettingKey,
            SettingValue = setting.SettingValue,
            Description = setting.Description,
            UpdatedAt = setting.UpdatedAt,
            UpdatedByUserId = setting.UpdatedByUserId
        };
    }
}
