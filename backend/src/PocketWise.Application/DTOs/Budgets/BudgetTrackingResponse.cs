using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.Budgets;

public class BudgetTrackingResponse
{
    public long BudgetId { get; set; }
    public string BudgetName { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = "THB";
    public BudgetScopeType ScopeType { get; set; }
    public long? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public long? TagId { get; set; }
    public string? TagName { get; set; }
    public decimal AmountLimit { get; set; }
    public BudgetPeriodType PeriodType { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public byte AlertThresholdPercent { get; set; }
    public bool IsActive { get; set; }
    public decimal SpentAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public decimal PercentageUsed { get; set; }
    public bool IsOverLimit { get; set; }
    public DateTime CreatedAt { get; set; }
}
