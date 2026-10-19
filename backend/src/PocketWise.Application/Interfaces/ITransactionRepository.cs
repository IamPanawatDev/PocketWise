using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Transactions;
using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface ITransactionRepository
{
    Task<Transaction?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<PagedResult<Transaction>> GetPagedAsync(long userId, TransactionFilter filter, int page, int pageSize, string sortBy, bool sortDesc, CancellationToken cancellationToken = default);
    Task AddAsync(Transaction transaction, CancellationToken cancellationToken = default);
    Task UpdateAsync(Transaction transaction, CancellationToken cancellationToken = default);
    Task SoftDeleteAsync(Transaction transaction, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
