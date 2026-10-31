using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PocketWise.Application.Interfaces;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Api.BackgroundServices;

/// <summary>
/// Background job that runs daily at night (default 02:00 AM) to purge audit logs older than 90 days.
/// </summary>
public class AuditLogCleanupBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuditLogCleanupBackgroundService> _logger;
    private readonly MaintenanceJobOptions _options;

    public AuditLogCleanupBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<AuditLogCleanupBackgroundService> logger,
        IOptions<MaintenanceJobOptions> options)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var config = _options.AuditLogCleanup;
        // Dynamic setting: checks SystemSettings table on each run (with fallback to configuration)
        if (false && !config.Enabled)
        {
            _logger.LogInformation("AuditLogCleanupBackgroundService is disabled in configuration.");
            return;
        }

        _logger.LogInformation(
            "AuditLogCleanupBackgroundService started. Scheduled to run daily at {Hour:D2}:{Minute:D2} (retention: {RetentionDays} days).",
            config.RunHour,
            config.RunMinute,
            config.RetentionDays);

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = JobScheduleHelper.GetDelayUntilNextDailyRun(config.RunHour, config.RunMinute, DateTime.Now);
            var nextRun = DateTime.Now + delay;

            _logger.LogInformation(
                "Daily Audit Log cleanup scheduled. Next run at {NextRun:yyyy-MM-dd HH:mm:ss} (in {Hours}h {Minutes}m).",
                nextRun,
                (int)delay.TotalHours,
                delay.Minutes);

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            try
            {

                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<PocketWiseDbContext>();

                var enabledSetting = await context.SystemSettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SettingKey == "AuditLogCleanup:Enabled", stoppingToken);
                var isEnabled = (enabledSetting != null && bool.TryParse(enabledSetting.SettingValue, out var eVal))
                    ? eVal
                    : config.Enabled;

                if (!isEnabled)
                {
                    _logger.LogInformation("Daily Audit Log cleanup skipped: disabled in SystemSettings.");
                    continue;
                }

                var retentionSetting = await context.SystemSettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SettingKey == "AuditLogCleanup:RetentionDays", stoppingToken);
                var retentionDays = (retentionSetting != null && int.TryParse(retentionSetting.SettingValue, out var rVal) && rVal > 0)
                    ? rVal
                    : config.RetentionDays;

                _logger.LogInformation("Executing daily Audit Log cleanup (purging logs older than {Days} days)...", retentionDays);

                var auditLogService = scope.ServiceProvider.GetRequiredService<IAuditLogService>();

                var result = await auditLogService.PurgeLogsAsync(retentionDays, actorUserId: 0, stoppingToken);
                _logger.LogInformation("Daily Audit Log cleanup completed successfully. Deleted {DeletedCount} logs.", result.DeletedCount);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogError(ex, "Error occurred during daily Audit Log cleanup background job.");
                }
                catch
                {
                    // Ignore logger disposal errors during host shutdown
                }
            }
        }
    }
}
