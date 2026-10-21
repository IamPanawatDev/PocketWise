using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class BankAccount
{
    public long BankAccountId { get; set; }
    public long UserId { get; set; }
    public string? BankCode { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string? AccountNumberMasked { get; set; }
    public AccountType AccountType { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<TransferGroup> FromTransferGroups { get; set; } = [];
    public ICollection<TransferGroup> ToTransferGroups { get; set; } = [];
}
