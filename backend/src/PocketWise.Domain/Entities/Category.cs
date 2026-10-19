using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class Category
{
    public long CategoryId { get; set; }
    public long? UserId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public TransactionType CategoryType { get; set; }
    public string? Icon { get; set; }
    public string? Color { get; set; }
    public int SortOrder { get; set; }
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<Budget> Budgets { get; set; } = [];
    public ICollection<CategoryRule> CategoryRules { get; set; } = [];
    public ICollection<RecurringTransaction> RecurringTransactions { get; set; } = [];
    public ICollection<Merchant> Merchants { get; set; } = [];
}
