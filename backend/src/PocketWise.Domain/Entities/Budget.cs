using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class Budget
{
    public long BudgetId { get; set; }
    public long UserId { get; set; }
    public string BudgetName { get; set; } = string.Empty;
    public BudgetScopeType ScopeType { get; set; }
    public long? CategoryId { get; set; }
    public long? TagId { get; set; }
    public decimal AmountLimit { get; set; }
    public BudgetPeriodType PeriodType { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public byte AlertThresholdPercent { get; set; } = 80;
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public Category? Category { get; set; }
    public Tag? Tag { get; set; }
}
