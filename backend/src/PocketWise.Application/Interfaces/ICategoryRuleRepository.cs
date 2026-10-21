using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface ICategoryRuleRepository
{
    Task<CategoryRule?> GetByIdAsync(long id, long? userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CategoryRule>> GetAllAsync(long? userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CategoryRule>> GetMatchingRulesAsync(long? userId, string text, CancellationToken cancellationToken = default);
    Task<bool> CategoryExistsAsync(long? userId, long categoryId, CancellationToken cancellationToken = default);
    Task AddAsync(CategoryRule rule, CancellationToken cancellationToken = default);
    Task UpdateAsync(CategoryRule rule, CancellationToken cancellationToken = default);
    Task DeleteAsync(CategoryRule rule, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
