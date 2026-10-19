using Microsoft.EntityFrameworkCore;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class BudgetRepository : IBudgetRepository
{
    private readonly PocketWiseDbContext _context;

    public BudgetRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<Budget?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        return await _context.Budgets
            .Include(b => b.Category)
            .Include(b => b.Tag)
            .FirstOrDefaultAsync(b => b.BudgetId == id && b.UserId == userId && !b.IsDeleted, cancellationToken);
    }

    public async Task<IReadOnlyList<Budget>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _context.Budgets
            .AsNoTracking()
            .Include(b => b.Category)
            .Include(b => b.Tag)
            .Where(b => b.UserId == userId && !b.IsDeleted)
            .OrderBy(b => b.BudgetName)
            .ToListAsync(cancellationToken);
    }

    public async Task<string> GetCurrencyCodeAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _context.UserSettings
            .Where(settings => settings.UserId == userId)
            .Select(settings => settings.CurrencyCode)
            .FirstOrDefaultAsync(cancellationToken) ?? "THB";
    }

    public async Task<decimal> GetSpentAmountAsync(long userId, string currencyCode, BudgetScopeType scopeType, long? categoryId, long? tagId, DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default)
    {
        var query = _context.Transactions
            .Where(t => t.UserId == userId
                && t.TransactionType == TransactionType.Expense
                && t.Status == TransactionStatus.Confirmed
                && t.CurrencyCode == currencyCode
                && t.TransactionDate >= fromUtc
                && t.TransactionDate < toUtc);

        query = scopeType switch
        {
            BudgetScopeType.Category => query.Where(t => t.CategoryId == categoryId),
            BudgetScopeType.Tag => query.Where(t => t.TransactionTags.Any(tt => tt.TagId == tagId)),
            _ => query
        };

        var total = await query.SumAsync(t => (decimal?)t.Amount, cancellationToken);
        return total ?? 0m;
    }

    public Task<bool> HasBudgetNotificationAsync(long userId, long budgetId, string notificationType, CancellationToken cancellationToken = default)
    {
        return _context.Notifications.AnyAsync(notification =>
            notification.UserId == userId
            && notification.RelatedEntityType == "Budget"
            && notification.RelatedEntityId == budgetId
            && notification.NotificationType == notificationType,
            cancellationToken);
    }

    public Task AddNotificationAsync(Notification notification, CancellationToken cancellationToken = default)
    {
        _context.Notifications.Add(notification);
        return Task.CompletedTask;
    }

    public Task<bool> CategoryExistsAsync(long userId, long categoryId, CancellationToken cancellationToken = default)
    {
        return _context.Categories.AnyAsync(
            c => c.CategoryId == categoryId && (c.UserId == userId || c.IsSystem),
            cancellationToken);
    }

    public Task<bool> TagExistsAsync(long userId, long tagId, CancellationToken cancellationToken = default)
    {
        return _context.Tags.AnyAsync(
            t => t.TagId == tagId && t.UserId == userId,
            cancellationToken);
    }

    public Task AddAsync(Budget budget, CancellationToken cancellationToken = default)
    {
        _context.Budgets.Add(budget);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Budget budget, CancellationToken cancellationToken = default)
    {
        _context.Budgets.Update(budget);
        return Task.CompletedTask;
    }

    public Task SoftDeleteAsync(Budget budget, CancellationToken cancellationToken = default)
    {
        budget.IsDeleted = true;
        _context.Budgets.Update(budget);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
