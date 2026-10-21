using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Transactions;

namespace PocketWise.Application.Interfaces;

public interface ITransactionService
{
    Task<TransactionResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<PagedResult<TransactionResponse>> GetPagedAsync(long userId, TransactionFilter filter, int page, int pageSize, string sortBy, bool sortDesc, CancellationToken cancellationToken = default);
    Task<TransactionResponse> CreateAsync(long userId, CreateTransactionRequest request, CancellationToken cancellationToken = default);
    Task<TransactionResponse?> UpdateAsync(long id, long userId, UpdateTransactionRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default);
}
