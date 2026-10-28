using Microsoft.EntityFrameworkCore;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Transactions;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class TransactionRepository : ITransactionRepository
{
    private readonly PocketWiseDbContext _context;

    public TransactionRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<Transaction?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        return await _context.Transactions
            .Include(t => t.Category)
            .Include(t => t.BankAccount)
            .Include(t => t.CreditCard)
            .Include(t => t.TransactionTags)
                .ThenInclude(tt => tt.Tag)
            .FirstOrDefaultAsync(t => t.TransactionId == id && t.UserId == userId && !t.IsDeleted, cancellationToken);
    }

    
    public async Task<bool> ExistsAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        return await _context.Transactions
            .IgnoreQueryFilters()
            .AnyAsync(t => t.TransactionId == id && t.UserId == userId, cancellationToken);
    }

    public async Task<PagedResult<Transaction>> GetPagedAsync(long userId, TransactionFilter filter, int page, int pageSize, string sortBy, bool sortDesc, CancellationToken cancellationToken = default)
    {
        var query = _context.Transactions
            .AsNoTracking()
            .Include(t => t.Category)
            .Include(t => t.BankAccount)
            .Include(t => t.CreditCard)
            .Include(t => t.TransactionTags)
                .ThenInclude(tt => tt.Tag)
            .Where(t => t.UserId == userId && !t.IsDeleted);

        if (filter.CategoryId.HasValue)
        {
            query = query.Where(t => t.CategoryId == filter.CategoryId.Value);
        }

        if (filter.TagId.HasValue)
        {
            query = query.Where(t => t.TransactionTags.Any(tt => tt.TagId == filter.TagId.Value));
        }

        if (filter.BankAccountId.HasValue)
        {
            query = query.Where(t => t.BankAccountId == filter.BankAccountId.Value);
        }

        if (filter.CreditCardId.HasValue)
        {
            query = query.Where(t => t.CreditCardId == filter.CreditCardId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.SourceType))
        {
            if (Enum.TryParse<SourceType>(filter.SourceType, ignoreCase: true, out var sourceType))
            {
                query = query.Where(t => t.SourceType == sourceType);
            }
        }

        if (!string.IsNullOrWhiteSpace(filter.Type))
        {
            if (Enum.TryParse<TransactionType>(filter.Type, ignoreCase: true, out var type))
            {
                query = query.Where(t => t.TransactionType == type);
            }
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(t => t.TransactionDate >= filter.FromDate.Value);
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(t => t.TransactionDate <= filter.ToDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Q))
        {
            var q = filter.Q.Trim();
            query = query.Where(t =>
                (t.Description != null && t.Description.Contains(q)) ||
                (t.Category != null && t.Category.CategoryName.Contains(q)));
        }

        query = ApplySorting(query, sortBy, sortDesc);

        var totalItems = await query.CountAsync(cancellationToken);
        var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Transaction>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = totalPages
        };
    }

    public Task AddAsync(Transaction transaction, CancellationToken cancellationToken = default)
    {
        _context.Transactions.Add(transaction);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Transaction transaction, CancellationToken cancellationToken = default)
    {
        _context.Transactions.Update(transaction);
        return Task.CompletedTask;
    }

    public Task SoftDeleteAsync(Transaction transaction, CancellationToken cancellationToken = default)
    {
        transaction.IsDeleted = true;
        transaction.UpdatedAt = DateTime.UtcNow;
        _context.Transactions.Update(transaction);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static IQueryable<Transaction> ApplySorting(IQueryable<Transaction> query, string sortBy, bool sortDesc)
    {
        return (sortBy?.ToLowerInvariant()) switch
        {
            "amount" => sortDesc
                ? query.OrderByDescending(t => t.Amount)
                : query.OrderBy(t => t.Amount),
            "transactiondate" => sortDesc
                ? query.OrderByDescending(t => t.TransactionDate)
                : query.OrderBy(t => t.TransactionDate),
            _ => sortDesc
                ? query.OrderByDescending(t => t.TransactionDate)
                : query.OrderBy(t => t.TransactionDate)
        };
    }
}
