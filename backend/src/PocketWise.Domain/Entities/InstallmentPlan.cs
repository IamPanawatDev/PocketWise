using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class InstallmentPlan
{
    public long InstallmentPlanId { get; set; }
    public long UserId { get; set; }
    public long CreditCardId { get; set; }
    public long? MerchantId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal PrincipalAmount { get; set; }
    public short InstallmentCount { get; set; }
    public decimal InstallmentAmount { get; set; }
    public decimal InterestRatePercent { get; set; }
    public DateOnly StartDate { get; set; }
    public InstallmentStatus Status { get; set; } = InstallmentStatus.Active;
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public CreditCard CreditCard { get; set; } = null!;
    public Merchant? Merchant { get; set; }
    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<CreditCardStatementItem> CreditCardStatementItems { get; set; } = [];
}
