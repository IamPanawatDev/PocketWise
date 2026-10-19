using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.Budgets;

public class CreateBudgetRequest
{
    public string BudgetName { get; set; } = string.Empty;
    public BudgetScopeType ScopeType { get; set; }
    public long? CategoryId { get; set; }
    public long? TagId { get; set; }
    public decimal AmountLimit { get; set; }
    public BudgetPeriodType PeriodType { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public byte AlertThresholdPercent { get; set; } = 80;
}
