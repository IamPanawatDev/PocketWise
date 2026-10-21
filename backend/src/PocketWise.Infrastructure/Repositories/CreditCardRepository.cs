using Microsoft.EntityFrameworkCore;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class CreditCardRepository : ICreditCardRepository
{
    private readonly PocketWiseDbContext _context;

    public CreditCardRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<CreditCard?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        return await _context.CreditCards
            .FirstOrDefaultAsync(c => c.CreditCardId == id && c.UserId == userId && !c.IsDeleted, cancellationToken);
    }

    public async Task<IReadOnlyList<CreditCard>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _context.CreditCards
            .AsNoTracking()
            .Where(c => c.UserId == userId && !c.IsDeleted)
            .OrderBy(c => c.CardName)
            .ToListAsync(cancellationToken);
    }

    public Task AddAsync(CreditCard creditCard, CancellationToken cancellationToken = default)
    {
        _context.CreditCards.Add(creditCard);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(CreditCard creditCard, CancellationToken cancellationToken = default)
    {
        _context.CreditCards.Update(creditCard);
        return Task.CompletedTask;
    }

    public Task SoftDeleteAsync(CreditCard creditCard, CancellationToken cancellationToken = default)
    {
        creditCard.IsDeleted = true;
        _context.CreditCards.Update(creditCard);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
