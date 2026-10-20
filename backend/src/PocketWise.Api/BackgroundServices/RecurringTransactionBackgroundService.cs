using Microsoft.Extensions.Options;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.BackgroundServices;

public class RecurringTransactionBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RecurringTransactionBackgroundService> _logger;
    private readonly RecurringJobOptions _options;

    public RecurringTransactionBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<RecurringTransactionBackgroundService> logger,
        IOptions<RecurringJobOptions> options)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Recurring transaction background service started (interval {IntervalMinutes}m).",
            _options.IntervalMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<IRecurringTransactionService>();
                await service.ProcessDueAsync(DateTime.UtcNow, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogError(ex, "Error while processing due recurring transactions.");
                }
                catch
                {
                    // Ignore logger disposal errors during host shutdown
                }
            }

            await Task.Delay(TimeSpan.FromMinutes(_options.IntervalMinutes), stoppingToken);
        }
    }
}
