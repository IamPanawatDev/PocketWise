using Microsoft.Extensions.Options;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.BackgroundServices;

/// <summary>
/// Background job that runs weekly every Sunday night (default Sunday 03:00 AM) to purge expired refresh tokens.
/// </summary>
public class RefreshTokenCleanupBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RefreshTokenCleanupBackgroundService> _logger;
    private readonly MaintenanceJobOptions _options;

    public RefreshTokenCleanupBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<RefreshTokenCleanupBackgroundService> logger,
        IOptions<MaintenanceJobOptions> options)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var config = _options.RefreshTokenCleanup;
        if (!config.Enabled)
        {
            _logger.LogInformation("RefreshTokenCleanupBackgroundService is disabled in configuration.");
            return;
        }

        _logger.LogInformation(
            "RefreshTokenCleanupBackgroundService started. Scheduled to run weekly on {DayOfWeek} at {Hour:D2}:{Minute:D2}.",
            config.RunDayOfWeek,
            config.RunHour,
            config.RunMinute);

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = JobScheduleHelper.GetDelayUntilNextWeeklyRun(config.RunDayOfWeek, config.RunHour, config.RunMinute, DateTime.Now);
            var nextRun = DateTime.Now + delay;

            _logger.LogInformation(
                "Weekly expired refresh token cleanup scheduled. Next run at {NextRun:yyyy-MM-dd HH:mm:ss} (in {Days}d {Hours}h {Minutes}m).",
                nextRun,
                (int)delay.TotalDays,
                delay.Hours,
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
                _logger.LogInformation("Executing weekly expired refresh token cleanup...");
                using var scope = _scopeFactory.CreateScope();
                var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();

                var deletedCount = await authService.PurgeExpiredRefreshTokensAsync(stoppingToken);
                _logger.LogInformation("Weekly refresh token cleanup completed successfully. Deleted {DeletedCount} expired/revoked tokens.", deletedCount);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogError(ex, "Error occurred during weekly refresh token cleanup background job.");
                }
                catch
                {
                    // Ignore logger disposal errors during host shutdown
                }
            }
        }
    }
}
