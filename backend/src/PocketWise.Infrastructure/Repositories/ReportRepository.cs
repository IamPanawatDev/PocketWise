using Microsoft.EntityFrameworkCore;
using PocketWise.Application.DTOs.Reports;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Enums;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public sealed class ReportRepository : IReportRepository
{
    private readonly PocketWiseDbContext _context;

    public ReportRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<ReportTransactionRecord>> GetTransactionsAsync(
        long userId,
        DateTime fromUtc,
        DateTime toUtc,
        long? categoryId,
        long? tagId,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Transactions
            .AsNoTracking()
            .Where(transaction =>
                transaction.UserId == userId
                && !transaction.IsDeleted
                && transaction.Status == TransactionStatus.Confirmed
                && transaction.TransactionType != TransactionType.Transfer
                && transaction.TransactionDate >= fromUtc
                && transaction.TransactionDate <= toUtc);

        if (categoryId.HasValue)
        {
            query = query.Where(transaction => transaction.CategoryId == categoryId.Value);
        }

        if (tagId.HasValue)
        {
            query = query.Where(transaction =>
                transaction.TransactionTags.Any(transactionTag => transactionTag.TagId == tagId.Value));
        }

        return await query
            .OrderBy(transaction => transaction.TransactionDate)
            .Select(transaction => new ReportTransactionRecord
            {
                TransactionId = transaction.TransactionId,
                TransactionDate = transaction.TransactionDate,
                TransactionType = transaction.TransactionType,
                Amount = transaction.Amount,
                CurrencyCode = transaction.CurrencyCode,
                SourceType = transaction.SourceType,
                Description = transaction.Description,
                CategoryId = transaction.CategoryId,
                CategoryName = transaction.Category == null ? null : transaction.Category.CategoryName,
                MerchantName = transaction.Merchant == null ? null : transaction.Merchant.MerchantName,
                BankAccountId = transaction.BankAccountId,
                AccountName = transaction.BankAccount == null ? null : transaction.BankAccount.AccountName,
                BankName = transaction.BankAccount == null ? null : transaction.BankAccount.BankName,
                CreditCardId = transaction.CreditCardId,
                CardName = transaction.CreditCard == null ? null : transaction.CreditCard.CardName,
                CreditCardBankName = transaction.CreditCard == null ? null : transaction.CreditCard.BankName
            })
            .ToListAsync(cancellationToken);
    }
}
