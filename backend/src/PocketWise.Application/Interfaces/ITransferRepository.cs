using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface ITransferRepository
{
    Task<TransferGroup?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TransferGroup>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task AddAsync(TransferGroup transferGroup, CancellationToken cancellationToken = default);
    Task AddTransactionsAsync(IEnumerable<Transaction> transactions, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
