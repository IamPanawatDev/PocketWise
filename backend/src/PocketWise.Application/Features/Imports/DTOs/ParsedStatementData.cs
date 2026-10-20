using PocketWise.Domain.Enums;

namespace PocketWise.Application.Features.Imports.DTOs;

public class ParsedStatementItem
{
    public DateOnly TransactionDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public StatementItemType ItemType { get; set; } = StatementItemType.Purchase;
    public string? ExternalReference { get; set; }
}

public class ParsedStatementData
{
    public DateOnly StatementDate { get; set; }
    public DateOnly StatementPeriodStart { get; set; }
    public DateOnly StatementPeriodEnd { get; set; }
    public DateOnly? PaymentDueDate { get; set; }
    public decimal PreviousBalance { get; set; }
    public decimal PurchaseAmount { get; set; }
    public decimal InstallmentAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public decimal CashbackAmount { get; set; }
    public decimal PaymentAmount { get; set; }
    public decimal TotalDue { get; set; }
    public List<ParsedStatementItem> Items { get; set; } = [];
}
