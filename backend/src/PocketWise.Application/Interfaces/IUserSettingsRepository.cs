using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface IUserSettingsRepository
{
    Task<UserSettings> GetOrCreateAsync(long userId, CancellationToken cancellationToken = default);
    Task SaveAsync(UserSettings settings, CancellationToken cancellationToken = default);
    Task ResetFinancialDataAsync(long userId, CancellationToken cancellationToken = default);
}
