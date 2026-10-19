using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class CreditCardStatementItem
{
    public long StatementItemId { get; set; }
    public long StatementId { get; set; }
    public DateOnly TransactionDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public StatementItemType ItemType { get; set; }
    public decimal Amount { get; set; }
    public long? MerchantId { get; set; }
    public long? InstallmentPlanId { get; set; }
    public long? TransactionId { get; set; }
    public string? ExternalReference { get; set; }
    public bool IsDuplicate { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public CreditCardStatement Statement { get; set; } = null!;
    public Merchant? Merchant { get; set; }
    public InstallmentPlan? InstallmentPlan { get; set; }
    public Transaction? Transaction { get; set; }
}
