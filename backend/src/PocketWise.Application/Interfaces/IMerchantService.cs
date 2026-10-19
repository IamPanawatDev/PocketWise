using PocketWise.Application.DTOs.Merchants;

namespace PocketWise.Application.Interfaces;

public interface IMerchantService
{
    Task<IReadOnlyList<MerchantResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<MerchantResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<MerchantResponse> CreateAsync(CreateMerchantRequest request, CancellationToken cancellationToken = default);
    Task<MerchantResponse?> UpdateAsync(long id, UpdateMerchantRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
}
