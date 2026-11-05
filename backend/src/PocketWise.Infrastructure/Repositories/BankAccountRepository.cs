using Microsoft.EntityFrameworkCore;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
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

    public async Task<Dictionary<long, decimal>> GetBalancesAsync(long userId, CancellationToken cancellationToken = default)
    {
        var txs = await _context.Transactions
            .AsNoTracking()
            .Include(t => t.TransferGroup)
            .Where(t => t.UserId == userId && !t.IsDeleted && t.BankAccountId != null)
            .Select(t => new
            {
                t.BankAccountId,
                t.TransactionType,
                t.Amount,
                ToBankAccountId = t.TransferGroup != null ? t.TransferGroup.ToBankAccountId : (long?)null,
                FromBankAccountId = t.TransferGroup != null ? t.TransferGroup.FromBankAccountId : (long?)null
            })
            .ToListAsync(cancellationToken);

        var result = new Dictionary<long, decimal>();
        foreach (var group in txs.GroupBy(t => t.BankAccountId!.Value))
        {
            decimal balance = 0;
            foreach (var t in group)
            {
                if (t.TransactionType == TransactionType.Income)
                {
                    balance += t.Amount;
                }
                else if (t.TransactionType == TransactionType.Expense)
                {
                    balance -= t.Amount;
                }
                else if (t.TransactionType == TransactionType.Transfer)
                {
                    if (t.ToBankAccountId == group.Key)
                    {
                        balance += t.Amount;
                    }
                    else if (t.FromBankAccountId == group.Key)
                    {
                        balance -= t.Amount;
                    }
                }
            }
            result[group.Key] = balance;
        }

        return result;
    }

    public async Task<decimal> GetBalanceAsync(long bankAccountId, long userId, CancellationToken cancellationToken = default)
    {
        var balances = await GetBalancesAsync(userId, cancellationToken);
        return balances.GetValueOrDefault(bankAccountId, 0m);
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
