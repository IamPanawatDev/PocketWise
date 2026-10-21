using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface IBankAccountRepository
{
    Task<BankAccount?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<BankAccount>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task AddAsync(BankAccount account, CancellationToken cancellationToken = default);
    Task UpdateAsync(BankAccount account, CancellationToken cancellationToken = default);
    Task<bool> HasTransactionsAsync(long id, CancellationToken cancellationToken = default);
    Task SoftDeleteAsync(BankAccount account, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
