using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.Transactions;

public class CreateTransactionRequest
{
    public TransactionType TransactionType { get; set; }
    public decimal Amount { get; set; }
    public string CurrencyCode { get; set; } = "THB";
    public DateTime TransactionDate { get; set; }
    public string? Description { get; set; }
    public long? CategoryId { get; set; }
    public long? BankAccountId { get; set; }
    public long? CreditCardId { get; set; }
    public IReadOnlyList<long> TagIds { get; set; } = [];
}
