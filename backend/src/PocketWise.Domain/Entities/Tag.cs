namespace PocketWise.Domain.Entities;

public class Tag
{
    public long TagId { get; set; }
    public long UserId { get; set; }
    public string TagName { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public ICollection<TransactionTag> TransactionTags { get; set; } = [];
    public ICollection<Budget> Budgets { get; set; } = [];
}
