namespace PocketWise.Domain.Entities;

public class CreditCard
{
    public long CreditCardId { get; set; }
    public long UserId { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string CardName { get; set; } = string.Empty;
    public string? CardNumberMasked { get; set; }
    public byte? BillingDay { get; set; }
    public byte? PaymentDueDay { get; set; }
    public decimal? CreditLimit { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<CreditCardStatement> CreditCardStatements { get; set; } = [];
    public ICollection<InstallmentPlan> InstallmentPlans { get; set; } = [];
}
