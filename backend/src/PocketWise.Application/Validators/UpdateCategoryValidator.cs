using FluentValidation;
using PocketWise.Application.DTOs.Categories;

namespace PocketWise.Application.Validators;

public class UpdateCategoryValidator : AbstractValidator<UpdateCategoryRequest>
{
    public UpdateCategoryValidator()
    {
        RuleFor(x => x.CategoryName).NotEmpty().MaximumLength(100).WithMessage("ต้องระบุชื่อหมวดหมู่ (ไม่เกิน 100 ตัวอักษร)");
        RuleFor(x => x.Icon).MaximumLength(100);
        RuleFor(x => x.Color).MaximumLength(20);
    }
}
