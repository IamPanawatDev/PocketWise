using PocketWise.Application.DTOs.CategoryRules;

namespace PocketWise.Application.Interfaces;

public interface ICategoryRuleService
{
    Task<IReadOnlyList<CategoryRuleResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task<CategoryRuleResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<CategoryRuleResponse> CreateAsync(long userId, CreateCategoryRuleRequest request, CancellationToken cancellationToken = default);
    Task<CategoryRuleResponse?> UpdateAsync(long id, long userId, UpdateCategoryRuleRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<CategorySuggestionResponse?> SuggestCategoryAsync(long userId, string description, CancellationToken cancellationToken = default);
    Task LearnFromManualAsync(long userId, string description, long categoryId, CancellationToken cancellationToken = default);
}
