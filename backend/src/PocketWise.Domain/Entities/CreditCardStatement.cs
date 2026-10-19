using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class CreditCardStatement
{
    public long StatementId { get; set; }
    public long CreditCardId { get; set; }
    public long? ImportJobId { get; set; }
    public DateOnly StatementPeriodStart { get; set; }
    public DateOnly StatementPeriodEnd { get; set; }
    public DateOnly StatementDate { get; set; }
    public DateOnly? PaymentDueDate { get; set; }
    public decimal PreviousBalance { get; set; }
    public decimal PurchaseAmount { get; set; }
    public decimal InstallmentAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public decimal CashbackAmount { get; set; }
    public decimal PaymentAmount { get; set; }
    public decimal TotalDue { get; set; }
    public CreditCardStatementStatus Status { get; set; } = CreditCardStatementStatus.Imported;
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public CreditCard CreditCard { get; set; } = null!;
    public ImportJob? ImportJob { get; set; }
    public ICollection<CreditCardStatementItem> Items { get; set; } = [];
}
