using Microsoft.Extensions.Options;
using PocketWise.Application.Interfaces;

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
        if (!config.Enabled)
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
                _logger.LogInformation("Executing daily Audit Log cleanup (purging logs older than {Days} days)...", config.RetentionDays);
                using var scope = _scopeFactory.CreateScope();
                var auditLogService = scope.ServiceProvider.GetRequiredService<IAuditLogService>();

                var result = await auditLogService.PurgeLogsAsync(config.RetentionDays, actorUserId: 0, stoppingToken);
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
