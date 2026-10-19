using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class CategoryRule
{
    public long CategoryRuleId { get; set; }
    public long? UserId { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public CategoryMatchType MatchType { get; set; }
    public string MatchPattern { get; set; } = string.Empty;
    public long CategoryId { get; set; }
    public int Priority { get; set; } = 100;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ApplicationUser? User { get; set; }
    public Category Category { get; set; } = null!;
}
