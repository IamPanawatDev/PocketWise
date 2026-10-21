using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.CategoryRules;

public class CategoryRuleResponse
{
    public long CategoryRuleId { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public CategoryMatchType MatchType { get; set; }
    public string MatchPattern { get; set; } = string.Empty;
    public long CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public int Priority { get; set; }
    public bool IsActive { get; set; }
    public bool IsGlobal { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
