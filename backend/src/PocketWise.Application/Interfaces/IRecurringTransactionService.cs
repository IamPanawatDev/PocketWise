using PocketWise.Application.DTOs.RecurringTransactions;

namespace PocketWise.Application.Interfaces;

public interface IRecurringTransactionService
{
    Task<IReadOnlyList<RecurringTransactionResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task<RecurringTransactionResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<RecurringTransactionResponse> CreateAsync(long userId, CreateRecurringTransactionRequest request, CancellationToken cancellationToken = default);
    Task<RecurringTransactionResponse?> UpdateAsync(long id, long userId, UpdateRecurringTransactionRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task ProcessDueAsync(DateTime nowUtc, CancellationToken cancellationToken = default);
}
