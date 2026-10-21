using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface IRecurringTransactionRepository
{
    Task<RecurringTransaction?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RecurringTransaction>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RecurringTransaction>> GetDueAsync(DateTime nowUtc, CancellationToken cancellationToken = default);
    Task<bool> CategoryExistsAsync(long userId, long categoryId, CancellationToken cancellationToken = default);
    Task AddAsync(RecurringTransaction entity, CancellationToken cancellationToken = default);
    Task UpdateAsync(RecurringTransaction entity, CancellationToken cancellationToken = default);
    Task SoftDeleteAsync(RecurringTransaction entity, CancellationToken cancellationToken = default);
    Task AddTransactionAsync(Transaction transaction, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
