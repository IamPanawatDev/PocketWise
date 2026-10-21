namespace PocketWise.Application.DTOs.Reports;

public sealed class ReportTrendResponse
{
    public string Period { get; init; } = string.Empty;
    public DateTimeOffset FromDate { get; init; }
    public DateTimeOffset ToDate { get; init; }
    public IReadOnlyList<ReportTrendPoint> Series { get; init; } = [];
}

public sealed class ReportTrendPoint
{
    public DateOnly PeriodStart { get; init; }
    public DateOnly PeriodEnd { get; init; }
    public string CurrencyCode { get; init; } = string.Empty;
    public decimal Income { get; init; }
    public decimal Expense { get; init; }
    public decimal NetAmount { get; init; }
}
