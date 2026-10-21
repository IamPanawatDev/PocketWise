using Microsoft.EntityFrameworkCore;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class BankAccountRepository : IBankAccountRepository
{
    private readonly PocketWiseDbContext _context;

    public BankAccountRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<BankAccount?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        return await _context.BankAccounts
            .FirstOrDefaultAsync(b => b.BankAccountId == id && b.UserId == userId, cancellationToken);
    }

    public async Task<IReadOnlyList<BankAccount>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _context.BankAccounts
            .AsNoTracking()
            .Where(b => b.UserId == userId)
            .OrderBy(b => b.AccountName)
            .ToListAsync(cancellationToken);
    }

    public Task AddAsync(BankAccount account, CancellationToken cancellationToken = default)
    {
        _context.BankAccounts.Add(account);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(BankAccount account, CancellationToken cancellationToken = default)
    {
        _context.BankAccounts.Update(account);
        return Task.CompletedTask;
    }

    public async Task<bool> HasTransactionsAsync(long id, CancellationToken cancellationToken = default)
    {
        return await _context.Transactions.AnyAsync(t => t.BankAccountId == id, cancellationToken);
    }

    public Task SoftDeleteAsync(BankAccount account, CancellationToken cancellationToken = default)
    {
        account.IsDeleted = true;
        _context.BankAccounts.Update(account);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
