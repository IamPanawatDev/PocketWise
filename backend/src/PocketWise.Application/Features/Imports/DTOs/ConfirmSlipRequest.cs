namespace PocketWise.Application.Features.Imports.DTOs;

public class ConfirmSlipRequest
{
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public long? CategoryId { get; set; }
    public long? BankAccountId { get; set; }
    public long? CreditCardId { get; set; }
    public string? PayeeName { get; set; }
    public string? PayerName { get; set; }
    public string? TransactionReference { get; set; }
    public List<long>? TagIds { get; set; }
}
