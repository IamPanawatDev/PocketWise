using Microsoft.EntityFrameworkCore;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class RecurringTransactionRepository : IRecurringTransactionRepository
{
    private readonly PocketWiseDbContext _context;

    public RecurringTransactionRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<RecurringTransaction?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        return await _context.RecurringTransactions
            .Include(r => r.Category)
            .FirstOrDefaultAsync(r =>
                r.RecurringTransactionId == id && r.UserId == userId && !r.IsDeleted,
                cancellationToken);
    }

    public async Task<IReadOnlyList<RecurringTransaction>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _context.RecurringTransactions
            .AsNoTracking()
            .Include(r => r.Category)
            .Where(r => r.UserId == userId && !r.IsDeleted)
            .OrderBy(r => r.NextRunAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<RecurringTransaction>> GetDueAsync(DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        return await _context.RecurringTransactions
            .Where(r => r.IsActive && !r.IsDeleted && r.NextRunAt <= nowUtc)
            .ToListAsync(cancellationToken);
    }

    public Task<bool> CategoryExistsAsync(long userId, long categoryId, CancellationToken cancellationToken = default)
    {
        return _context.Categories.AnyAsync(
            c => c.CategoryId == categoryId && (c.UserId == userId || c.IsSystem),
            cancellationToken);
    }

    public Task AddAsync(RecurringTransaction entity, CancellationToken cancellationToken = default)
    {
        _context.RecurringTransactions.Add(entity);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(RecurringTransaction entity, CancellationToken cancellationToken = default)
    {
        _context.RecurringTransactions.Update(entity);
        return Task.CompletedTask;
    }

    public Task SoftDeleteAsync(RecurringTransaction entity, CancellationToken cancellationToken = default)
    {
        entity.IsDeleted = true;
        _context.RecurringTransactions.Update(entity);
        return Task.CompletedTask;
    }

    public Task AddTransactionAsync(Transaction transaction, CancellationToken cancellationToken = default)
    {
        _context.Transactions.Add(transaction);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
