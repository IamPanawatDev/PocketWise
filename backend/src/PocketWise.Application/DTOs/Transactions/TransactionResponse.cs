using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.Transactions;

public class TransactionResponse
{
    public long TransactionId { get; set; }
    public TransactionType TransactionType { get; set; }
    public decimal Amount { get; set; }
    public string CurrencyCode { get; set; } = "THB";
    public DateTime TransactionDate { get; set; }
    public string? Description { get; set; }
    public long? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public long? BankAccountId { get; set; }
    public long? CreditCardId { get; set; }
    public SourceType SourceType { get; set; }
    public long? TransferGroupId { get; set; }
    public long? RecurringTransactionId { get; set; }
    public TransactionStatus Status { get; set; }
    public IReadOnlyList<TagRef> Tags { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class TagRef
{
    public long TagId { get; set; }
    public string TagName { get; set; } = string.Empty;
}
