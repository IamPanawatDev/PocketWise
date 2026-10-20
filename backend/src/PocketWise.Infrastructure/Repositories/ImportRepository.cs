using Microsoft.EntityFrameworkCore;
using PocketWise.Application.DTOs;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class ImportRepository : IImportRepository
{
    private readonly PocketWiseDbContext _dbContext;

    public ImportRepository(PocketWiseDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddImportJobAsync(ImportJob job, CancellationToken cancellationToken = default)
    {
        await _dbContext.ImportJobs.AddAsync(job, cancellationToken);
    }

    public async Task<ImportJob?> GetImportJobByIdAsync(long userId, long jobId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ImportJobs
            .FirstOrDefaultAsync(j => j.UserId == userId && j.ImportJobId == jobId, cancellationToken);
    }

    public async Task<PagedResult<ImportJob>> GetImportJobsPagedAsync(
        long userId,
        int page,
        int pageSize,
        ImportType? type,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ImportJobs
            .AsNoTracking()
            .Where(j => j.UserId == userId);

        if (type.HasValue)
        {
            query = query.Where(j => j.ImportType == type.Value);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

        var items = await query
            .OrderByDescending(j => j.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<ImportJob>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = totalPages
        };
    }

    public async Task AddSlipImportFileAsync(SlipImportFile slip, CancellationToken cancellationToken = default)
    {
        await _dbContext.SlipImportFiles.AddAsync(slip, cancellationToken);
    }

    public async Task<SlipImportFile?> GetSlipByIdAsync(long userId, long slipId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.SlipImportFiles
            .Include(s => s.ImportJob)
            .Include(s => s.Transaction)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.SlipImportFileId == slipId, cancellationToken);
    }

    public async Task<SlipImportFile?> GetSlipByHashAsync(long userId, string fileHash, CancellationToken cancellationToken = default)
    {
        return await _dbContext.SlipImportFiles
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.FileHash == fileHash, cancellationToken);
    }

    public async Task AddStatementAsync(CreditCardStatement statement, CancellationToken cancellationToken = default)
    {
        await _dbContext.CreditCardStatements.AddAsync(statement, cancellationToken);
    }

    public async Task<CreditCardStatement?> GetStatementByIdAsync(long userId, long statementId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.CreditCardStatements
            .Include(s => s.CreditCard)
            .Include(s => s.Items.Where(i => !i.IsDeleted))
            .FirstOrDefaultAsync(s => s.CreditCard.UserId == userId && s.StatementId == statementId && !s.IsDeleted, cancellationToken);
    }

    public async Task<IReadOnlyList<CreditCardStatement>> GetStatementsByCardIdAsync(long userId, long cardId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.CreditCardStatements
            .Include(s => s.CreditCard)
            .Include(s => s.Items.Where(i => !i.IsDeleted))
            .AsNoTracking()
            .Where(s => s.CreditCard.UserId == userId && s.CreditCardId == cardId && !s.IsDeleted)
            .OrderByDescending(s => s.StatementDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<CreditCardStatementItem?> GetStatementItemByIdAsync(long statementItemId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.CreditCardStatementItems
            .Include(i => i.Statement)
                .ThenInclude(s => s.CreditCard)
            .FirstOrDefaultAsync(i => i.StatementItemId == statementItemId && !i.IsDeleted, cancellationToken);
    }

    public async Task<IReadOnlyList<CreditCardStatementItem>> GetStatementItemsByIdsAsync(IEnumerable<long> statementItemIds, CancellationToken cancellationToken = default)
    {
        var idList = statementItemIds.ToList();
        return await _dbContext.CreditCardStatementItems
            .Include(i => i.Statement)
                .ThenInclude(s => s.CreditCard)
            .Where(i => idList.Contains(i.StatementItemId) && !i.IsDeleted)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> HasDuplicateItemAsync(
        long creditCardId,
        DateOnly transactionDate,
        decimal amount,
        string? externalReference,
        CancellationToken cancellationToken = default)
    {
        // 1. If external reference exists, check matching statement item on this card
        if (!string.IsNullOrWhiteSpace(externalReference))
        {
            var refExists = await _dbContext.CreditCardStatementItems
                .AnyAsync(i => i.Statement.CreditCardId == creditCardId &&
                               !i.IsDeleted &&
                               i.ExternalReference == externalReference, cancellationToken);
            if (refExists) return true;
        }

        // 2. Check existing transaction on this credit card with same date and amount
        var startUtc = transactionDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endUtc = transactionDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var txnExists = await _dbContext.Transactions
            .AnyAsync(t => t.CreditCardId == creditCardId &&
                           !t.IsDeleted &&
                           t.Amount == amount &&
                           t.TransactionDate >= startUtc &&
                           t.TransactionDate <= endUtc, cancellationToken);

        return txnExists;
    }

    public async Task AddTransactionAsync(Transaction transaction, CancellationToken cancellationToken = default)
    {
        await _dbContext.Transactions.AddAsync(transaction, cancellationToken);
    }

    public async Task AddTransactionsAsync(IEnumerable<Transaction> transactions, CancellationToken cancellationToken = default)
    {
        await _dbContext.Transactions.AddRangeAsync(transactions, cancellationToken);
    }

    public async Task<(long? CategoryId, string? CategoryName)> SuggestCategoryAsync(long userId, string? text, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return (null, null);
        }

        var normalized = text.Trim().ToLowerInvariant();

        // 1. Check user & global CategoryRules (ordered by priority descending)
        var rules = await _dbContext.CategoryRules
            .Include(r => r.Category)
            .AsNoTracking()
            .Where(r => (r.UserId == userId || r.UserId == null) && r.IsActive)
            .OrderByDescending(r => r.Priority)
            .ToListAsync(cancellationToken);

        foreach (var rule in rules)
        {
            if (normalized.Contains(rule.MatchPattern.ToLowerInvariant()))
            {
                return (rule.CategoryId, rule.Category?.CategoryName);
            }
        }

        // 2. Check Merchants
        var merchant = await _dbContext.Merchants
            .Include(m => m.DefaultCategory)
            .AsNoTracking()
            .FirstOrDefaultAsync(m => normalized.Contains(m.NormalizedName) || normalized.Contains(m.MerchantName.ToLower()), cancellationToken);

        if (merchant?.DefaultCategoryId != null)
        {
            return (merchant.DefaultCategoryId, merchant.DefaultCategory?.CategoryName);
        }

        return (null, null);
    }

    public async Task<bool> CreditCardExistsAsync(long userId, long creditCardId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.CreditCards
            .AnyAsync(c => c.UserId == userId && c.CreditCardId == creditCardId && !c.IsDeleted, cancellationToken);
    }

    public async Task<string> GetCurrencyCodeAsync(long userId, CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.UserSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

        return settings?.CurrencyCode ?? "THB";
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
