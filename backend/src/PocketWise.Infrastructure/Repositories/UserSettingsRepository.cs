using Microsoft.EntityFrameworkCore;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public sealed class UserSettingsRepository : IUserSettingsRepository
{
    private readonly PocketWiseDbContext _context;

    public UserSettingsRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<UserSettings> GetOrCreateAsync(long userId, CancellationToken cancellationToken = default)
    {
        var settings = await _context.UserSettings
            .FirstOrDefaultAsync(item => item.UserId == userId, cancellationToken);
        if (settings is not null)
        {
            return settings;
        }

        settings = new UserSettings { UserId = userId, Theme = Theme.Dark, UpdatedAt = DateTime.UtcNow };
        await _context.UserSettings.AddAsync(settings, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return settings;
    }

    public async Task SaveAsync(UserSettings settings, CancellationToken cancellationToken = default)
    {
        _context.UserSettings.Update(settings);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task ResetFinancialDataAsync(long userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        await _context.CreditCardStatementItems
            .IgnoreQueryFilters()
            .Where(item => !item.IsDeleted && item.Statement.CreditCard.UserId == userId)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.IsDeleted, true), cancellationToken);

        await _context.CreditCardStatements
            .IgnoreQueryFilters()
            .Where(statement => !statement.IsDeleted && statement.CreditCard.UserId == userId)
            .ExecuteUpdateAsync(update => update.SetProperty(statement => statement.IsDeleted, true), cancellationToken);

        await _context.InstallmentPlans
            .IgnoreQueryFilters()
            .Where(plan => !plan.IsDeleted && plan.UserId == userId)
            .ExecuteUpdateAsync(update => update.SetProperty(plan => plan.IsDeleted, true), cancellationToken);

        await _context.Transactions
            .IgnoreQueryFilters()
            .Where(item => !item.IsDeleted && item.UserId == userId)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.IsDeleted, true), cancellationToken);

        await _context.TransferGroups
            .IgnoreQueryFilters()
            .Where(item => !item.IsDeleted && item.UserId == userId)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.IsDeleted, true), cancellationToken);

        await _context.Budgets
            .IgnoreQueryFilters()
            .Where(item => !item.IsDeleted && item.UserId == userId)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.IsDeleted, true), cancellationToken);

        await _context.RecurringTransactions
            .IgnoreQueryFilters()
            .Where(item => !item.IsDeleted && item.UserId == userId)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.IsDeleted, true), cancellationToken);

        await _context.BankAccounts
            .IgnoreQueryFilters()
            .Where(item => !item.IsDeleted && item.UserId == userId)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.IsDeleted, true), cancellationToken);

        await _context.CreditCards
            .IgnoreQueryFilters()
            .Where(item => !item.IsDeleted && item.UserId == userId)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.IsDeleted, true), cancellationToken);

        await _context.UserRefreshTokens
            .Where(token => token.UserId == userId && token.RevokedAt == null)
            .ExecuteUpdateAsync(
                update => update
                    .SetProperty(token => token.RevokedAt, now)
                    .SetProperty(token => token.ReasonRevoked, RevokeReason.Logout),
                cancellationToken);

        await transaction.CommitAsync(cancellationToken);
    }
}
