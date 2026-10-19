using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface IMerchantRepository
{
    Task<Merchant?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Merchant>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Merchant>> SearchByNameAsync(string normalizedName, CancellationToken cancellationToken = default);
    Task<bool> CategoryExistsAsync(long categoryId, CancellationToken cancellationToken = default);
    Task AddAsync(Merchant merchant, CancellationToken cancellationToken = default);
    Task UpdateAsync(Merchant merchant, CancellationToken cancellationToken = default);
    Task DeleteAsync(Merchant merchant, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
