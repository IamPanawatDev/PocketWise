namespace PocketWise.Application.Features.Imports.DTOs;

public class CreditCardStatementImportResponse
{
    public long StatementId { get; set; }
    public long? ImportJobId { get; set; }
    public long CreditCardId { get; set; }
    public string? CardName { get; set; }
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
    public string Status { get; set; } = string.Empty;
    public int TotalItems { get; set; }
    public int DuplicateItems { get; set; }
    public List<StatementItemResponse> Items { get; set; } = [];
}
