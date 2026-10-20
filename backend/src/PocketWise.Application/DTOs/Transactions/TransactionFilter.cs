namespace PocketWise.Application.DTOs.Transactions;

public class TransactionFilter
{
    public long? CategoryId { get; set; }
    public long? TagId { get; set; }
    public long? BankAccountId { get; set; }
    public long? CreditCardId { get; set; }
    public string? SourceType { get; set; }
    public string? Type { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Q { get; set; }
}
