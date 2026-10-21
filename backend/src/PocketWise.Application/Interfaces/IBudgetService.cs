using PocketWise.Application.DTOs.Budgets;

namespace PocketWise.Application.Interfaces;

public interface IBudgetService
{
    Task<IReadOnlyList<BudgetResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task<BudgetResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<BudgetTrackingResponse>> GetTrackingAsync(long userId, CancellationToken cancellationToken = default);
    Task<BudgetResponse> CreateAsync(long userId, CreateBudgetRequest request, CancellationToken cancellationToken = default);
    Task<BudgetResponse?> UpdateAsync(long id, long userId, UpdateBudgetRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default);
}
