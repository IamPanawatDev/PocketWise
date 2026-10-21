using Microsoft.EntityFrameworkCore;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class TransferRepository : ITransferRepository
{
    private readonly PocketWiseDbContext _context;

    public TransferRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<TransferGroup?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        return await _context.TransferGroups
            .FirstOrDefaultAsync(t => t.TransferGroupId == id && t.UserId == userId, cancellationToken);
    }

    public async Task<IReadOnlyList<TransferGroup>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _context.TransferGroups
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.TransferDate)
            .ToListAsync(cancellationToken);
    }

    public Task AddAsync(TransferGroup transferGroup, CancellationToken cancellationToken = default)
    {
        _context.TransferGroups.Add(transferGroup);
        return Task.CompletedTask;
    }

    public Task AddTransactionsAsync(IEnumerable<Transaction> transactions, CancellationToken cancellationToken = default)
    {
        _context.Transactions.AddRange(transactions);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
