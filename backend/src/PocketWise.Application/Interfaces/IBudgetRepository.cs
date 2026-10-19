using PocketWise.Application.DTOs.Budgets;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Application.Interfaces;

public interface IBudgetRepository
{
    Task<Budget?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Budget>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task<string> GetCurrencyCodeAsync(long userId, CancellationToken cancellationToken = default);
    Task<decimal> GetSpentAmountAsync(long userId, string currencyCode, BudgetScopeType scopeType, long? categoryId, long? tagId, DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default);
    Task<bool> HasBudgetNotificationAsync(long userId, long budgetId, string notificationType, CancellationToken cancellationToken = default);
    Task AddNotificationAsync(Notification notification, CancellationToken cancellationToken = default);
    Task<bool> CategoryExistsAsync(long userId, long categoryId, CancellationToken cancellationToken = default);
    Task<bool> TagExistsAsync(long userId, long tagId, CancellationToken cancellationToken = default);
    Task AddAsync(Budget budget, CancellationToken cancellationToken = default);
    Task UpdateAsync(Budget budget, CancellationToken cancellationToken = default);
    Task SoftDeleteAsync(Budget budget, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
