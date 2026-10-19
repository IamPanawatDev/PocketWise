using FluentValidation;
using PocketWise.Application.DTOs.Tags;

namespace PocketWise.Application.Validators;

public class UpdateTagValidator : AbstractValidator<UpdateTagRequest>
{
    public UpdateTagValidator()
    {
        RuleFor(x => x.TagName).NotEmpty().MaximumLength(50).WithMessage("ต้องระบุชื่อแท็ก (ไม่เกิน 50 ตัวอักษร)");
        RuleFor(x => x.Color).MaximumLength(20);
    }
}
