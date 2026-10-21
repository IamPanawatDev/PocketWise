using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface ICategoryRepository
{
    Task<Category?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Category>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task<bool> NameExistsAsync(long userId, string name, long? excludeId = null, CancellationToken cancellationToken = default);
    Task AddAsync(Category category, CancellationToken cancellationToken = default);
    Task UpdateAsync(Category category, CancellationToken cancellationToken = default);
    Task<bool> HasTransactionsAsync(long id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Category>> GetSystemCategoriesAsync(CancellationToken cancellationToken = default);
    Task<Category?> GetSystemCategoryByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> SystemNameExistsAsync(string name, long? excludeId = null, CancellationToken cancellationToken = default);
    Task DeleteAsync(Category category, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
