using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.Reports;

public sealed class ReportTransactionRecord
{
    public DateTime TransactionDate { get; init; }
    public TransactionType TransactionType { get; init; }
    public decimal Amount { get; init; }
    public string CurrencyCode { get; init; } = string.Empty;
    public SourceType SourceType { get; init; }
    public long? CategoryId { get; init; }
    public string? CategoryName { get; init; }
    public long? BankAccountId { get; init; }
    public string? AccountName { get; init; }
    public string? BankName { get; init; }
    public long? CreditCardId { get; init; }
    public string? CardName { get; init; }
    public string? CreditCardBankName { get; init; }
}
