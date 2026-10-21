using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class TransferGroup
{
    public long TransferGroupId { get; set; }
    public long UserId { get; set; }
    public long FromBankAccountId { get; set; }
    public long ToBankAccountId { get; set; }
    public decimal Amount { get; set; }
    public DateTime TransferDate { get; set; }
    public string? Reference { get; set; }
    public TransferGroupStatus Status { get; set; } = TransferGroupStatus.Pending;
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public BankAccount FromBankAccount { get; set; } = null!;
    public BankAccount ToBankAccount { get; set; } = null!;
    public ICollection<Transaction> Transactions { get; set; } = [];
}
