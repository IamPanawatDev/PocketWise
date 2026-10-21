namespace PocketWise.Application.DTOs.CreditCards;

public class CreditCardResponse
{
    public long CreditCardId { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string CardName { get; set; } = string.Empty;
    public string? CardNumberMasked { get; set; }
    public byte? BillingDay { get; set; }
    public byte? PaymentDueDay { get; set; }
    public decimal? CreditLimit { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
