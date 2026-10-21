using PocketWise.Application.DTOs.Merchants;

namespace PocketWise.Application.Interfaces;

public interface IMerchantService
{
    Task<IReadOnlyList<MerchantResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<MerchantResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<MerchantResponse> CreateAsync(long actorUserId, CreateMerchantRequest request, CancellationToken cancellationToken = default);
    Task<MerchantResponse?> UpdateAsync(long id, long actorUserId, UpdateMerchantRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, long actorUserId, CancellationToken cancellationToken = default);
}
