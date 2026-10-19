namespace PocketWise.Application.DTOs.Reports;

public sealed class ReportSummaryResponse
{
    public DateTimeOffset FromDate { get; init; }
    public DateTimeOffset ToDate { get; init; }
    public IReadOnlyList<ReportCurrencySummary> Currencies { get; init; } = [];
}

public sealed class ReportCurrencySummary
{
    public string CurrencyCode { get; init; } = string.Empty;
    public decimal TotalIncome { get; init; }
    public decimal TotalExpense { get; init; }
    public decimal NetAmount { get; init; }
    public IReadOnlyList<ReportCategoryBreakdown> CategoryBreakdown { get; init; } = [];
    public IReadOnlyList<ReportSourceBreakdown> SourceBreakdown { get; init; } = [];
    public IReadOnlyList<ReportBankAccountBreakdown> BankAccountBreakdown { get; init; } = [];
    public IReadOnlyList<ReportCreditCardBreakdown> CreditCardBreakdown { get; init; } = [];
}

public sealed class ReportCategoryBreakdown
{
    public long? CategoryId { get; init; }
    public string CategoryName { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public decimal Percentage { get; init; }
}

public sealed class ReportSourceBreakdown
{
    public string SourceType { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public decimal Percentage { get; init; }
}

public sealed class ReportBankAccountBreakdown
{
    public long? BankAccountId { get; init; }
    public string AccountName { get; init; } = string.Empty;
    public string? BankName { get; init; }
    public decimal Amount { get; init; }
    public decimal Percentage { get; init; }
}

public sealed class ReportCreditCardBreakdown
{
    public long? CreditCardId { get; init; }
    public string CardName { get; init; } = string.Empty;
    public string? BankName { get; init; }
    public decimal Amount { get; init; }
    public decimal Percentage { get; init; }
}
