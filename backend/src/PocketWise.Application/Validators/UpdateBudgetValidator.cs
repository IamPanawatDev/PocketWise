using FluentValidation;
using PocketWise.Application.DTOs.Budgets;
using PocketWise.Domain.Enums;

namespace PocketWise.Application.Validators;

public class UpdateBudgetValidator : AbstractValidator<UpdateBudgetRequest>
{
    public UpdateBudgetValidator()
    {
        RuleFor(x => x.BudgetName).NotEmpty().MaximumLength(150).WithMessage("ต้องระบุชื่องบ");
        RuleFor(x => x.AmountLimit).GreaterThan(0).WithMessage("วงเงินงบต้องมากกว่า 0");
        RuleFor(x => x.AlertThresholdPercent).InclusiveBetween((byte)1, (byte)100).WithMessage("เปอร์เซ็นต์แจ้งเตือนต้องอยู่ระหว่าง 1 ถึง 100");
        RuleFor(x => x.StartDate).NotEmpty().WithMessage("ต้องระบุวันที่เริ่มรอบงบ");
        RuleFor(x => x.EndDate)
            .Must((req, end) => !end.HasValue || end.Value >= req.StartDate)
            .WithMessage("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม");

        RuleFor(x => x.CategoryId)
            .Must((req, categoryId) => req.ScopeType != BudgetScopeType.Category || categoryId.HasValue)
            .WithMessage("งบแบบหมวดหมู่ต้องระบุ categoryId");

        RuleFor(x => x.TagId)
            .Must((req, tagId) => req.ScopeType != BudgetScopeType.Tag || tagId.HasValue)
            .WithMessage("งบแบบแท็กต้องระบุ tagId");
    }
}
