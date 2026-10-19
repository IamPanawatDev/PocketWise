using PocketWise.Application.DTOs.BankAccounts;

namespace PocketWise.Application.Interfaces;

public interface IBankAccountService
{
    Task<IReadOnlyList<BankAccountResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task<BankAccountResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<BankAccountResponse> CreateAsync(long userId, CreateBankAccountRequest request, CancellationToken cancellationToken = default);
    Task<BankAccountResponse?> UpdateAsync(long id, long userId, UpdateBankAccountRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default);
}
