using PocketWise.Application.DTOs;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Application.Interfaces;

public interface IImportRepository
{
    // ImportJobs
    Task AddImportJobAsync(ImportJob job, CancellationToken cancellationToken = default);
    Task<ImportJob?> GetImportJobByIdAsync(long userId, long jobId, CancellationToken cancellationToken = default);
    Task<PagedResult<ImportJob>> GetImportJobsPagedAsync(long userId, int page, int pageSize, ImportType? type, CancellationToken cancellationToken = default);

    // SlipImportFiles
    Task AddSlipImportFileAsync(SlipImportFile slip, CancellationToken cancellationToken = default);
    Task<SlipImportFile?> GetSlipByIdAsync(long userId, long slipId, CancellationToken cancellationToken = default);
    Task<SlipImportFile?> GetSlipByHashAsync(long userId, string fileHash, CancellationToken cancellationToken = default);

    // CreditCardStatements
    Task AddStatementAsync(CreditCardStatement statement, CancellationToken cancellationToken = default);
    Task<CreditCardStatement?> GetStatementByIdAsync(long userId, long statementId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CreditCardStatement>> GetStatementsByCardIdAsync(long userId, long cardId, CancellationToken cancellationToken = default);

    // StatementItems & Duplicates
    Task<CreditCardStatementItem?> GetStatementItemByIdAsync(long statementItemId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CreditCardStatementItem>> GetStatementItemsByIdsAsync(IEnumerable<long> statementItemIds, CancellationToken cancellationToken = default);
    Task<bool> HasDuplicateItemAsync(long creditCardId, DateOnly transactionDate, decimal amount, string? externalReference, CancellationToken cancellationToken = default);

    // Transactions
    Task AddTransactionAsync(Transaction transaction, CancellationToken cancellationToken = default);
    Task AddTransactionsAsync(IEnumerable<Transaction> transactions, CancellationToken cancellationToken = default);

    // Suggestions / Auto-categorization
    Task<(long? CategoryId, string? CategoryName)> SuggestCategoryAsync(long userId, string? text, CancellationToken cancellationToken = default);

    // Credit Card validation
    Task<bool> CreditCardExistsAsync(long userId, long creditCardId, CancellationToken cancellationToken = default);
    Task<string> GetCurrencyCodeAsync(long userId, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
