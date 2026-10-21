using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface ICreditCardRepository
{
    Task<CreditCard?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CreditCard>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task AddAsync(CreditCard creditCard, CancellationToken cancellationToken = default);
    Task UpdateAsync(CreditCard creditCard, CancellationToken cancellationToken = default);
    Task SoftDeleteAsync(CreditCard creditCard, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
