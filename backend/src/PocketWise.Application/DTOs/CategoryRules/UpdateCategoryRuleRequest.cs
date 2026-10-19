using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.CategoryRules;

public class UpdateCategoryRuleRequest
{
    public string RuleName { get; set; } = string.Empty;
    public CategoryMatchType MatchType { get; set; }
    public string MatchPattern { get; set; } = string.Empty;
    public long CategoryId { get; set; }
    public int Priority { get; set; } = 100;
    public bool IsActive { get; set; } = true;
}
