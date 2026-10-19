using FluentValidation;
using PocketWise.Application.DTOs.CategoryRules;

namespace PocketWise.Application.Validators;

public class UpdateCategoryRuleValidator : AbstractValidator<UpdateCategoryRuleRequest>
{
    public UpdateCategoryRuleValidator()
    {
        RuleFor(x => x.RuleName).NotEmpty().MaximumLength(150).WithMessage("ต้องระบุชื่อกฎ");
        RuleFor(x => x.MatchPattern).NotEmpty().MaximumLength(300).WithMessage("ต้องระบุรูปแบบที่จับคู่");
        RuleFor(x => x.CategoryId).GreaterThan(0).WithMessage("ต้องระบุหมวดหมู่");
        RuleFor(x => x.Priority).GreaterThanOrEqualTo(0).WithMessage("Priority ต้องไม่ติดลบ");
    }
}
