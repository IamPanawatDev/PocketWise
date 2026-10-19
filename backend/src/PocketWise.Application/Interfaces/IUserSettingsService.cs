using PocketWise.Application.DTOs.Settings;

namespace PocketWise.Application.Interfaces;

public interface IUserSettingsService
{
    Task<UserSettingsResponse> GetAsync(long userId, CancellationToken cancellationToken = default);
    Task<UserSettingsResponse> UpdateAsync(long userId, UpdateUserSettingsRequest request, CancellationToken cancellationToken = default);
    Task<DataResetResponse> ResetFinancialDataAsync(long userId, CancellationToken cancellationToken = default);
}
