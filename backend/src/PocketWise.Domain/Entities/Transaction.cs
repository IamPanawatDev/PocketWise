using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class Transaction
{
    public long TransactionId { get; set; }
    public long UserId { get; set; }
    public TransactionType TransactionType { get; set; }
    public decimal Amount { get; set; }
    public string CurrencyCode { get; set; } = "THB";
    public DateTime TransactionDate { get; set; }
    public string? Description { get; set; }
    public long? CategoryId { get; set; }
    public long? MerchantId { get; set; }
    public long? BankAccountId { get; set; }
    public long? CreditCardId { get; set; }
    public SourceType SourceType { get; set; }
    public long? ImportJobId { get; set; }
    public long? SlipImportFileId { get; set; }
    public long? StatementItemId { get; set; }
    public long? TransferGroupId { get; set; }
    public long? RecurringTransactionId { get; set; }
    public TransactionStatus Status { get; set; } = TransactionStatus.Confirmed;
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ApplicationUser User { get; set; } = null!;
    public Category? Category { get; set; }
    public Merchant? Merchant { get; set; }
    public BankAccount? BankAccount { get; set; }
    public CreditCard? CreditCard { get; set; }
    public ImportJob? ImportJob { get; set; }
    public SlipImportFile? SlipImportFile { get; set; }
    public CreditCardStatementItem? StatementItem { get; set; }
    public TransferGroup? TransferGroup { get; set; }
    public RecurringTransaction? RecurringTransaction { get; set; }
    public ICollection<TransactionTag> TransactionTags { get; set; } = [];
}
