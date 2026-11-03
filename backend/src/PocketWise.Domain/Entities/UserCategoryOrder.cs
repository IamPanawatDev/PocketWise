namespace PocketWise.Domain.Entities;

public class UserCategoryOrder
{
    public long UserId { get; set; }
    public long CategoryId { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public Category Category { get; set; } = null!;
}
