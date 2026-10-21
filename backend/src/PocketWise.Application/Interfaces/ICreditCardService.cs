using PocketWise.Application.DTOs.CreditCards;

namespace PocketWise.Application.Interfaces;

public interface ICreditCardService
{
    Task<IReadOnlyList<CreditCardResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task<CreditCardResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<CreditCardResponse> CreateAsync(long userId, CreateCreditCardRequest request, CancellationToken cancellationToken = default);
    Task<CreditCardResponse?> UpdateAsync(long id, long userId, UpdateCreditCardRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default);
}
