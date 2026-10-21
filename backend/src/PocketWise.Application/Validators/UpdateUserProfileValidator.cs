using FluentValidation;
using PocketWise.Application.DTOs.Auth;

namespace PocketWise.Application.Validators;

public class UpdateUserProfileValidator : AbstractValidator<UpdateUserProfileRequest>
{
    public UpdateUserProfileValidator()
    {
        RuleFor(request => request.Email)
            .NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(request => request.DisplayName)
            .NotEmpty().MaximumLength(150);
        RuleFor(request => request.PhoneNumber)
            .MaximumLength(30)
            .Matches(@"^(0\d{1,2}-?\d{3,4}-?\d{4}|0\d{8,9})$")
            .When(request => !string.IsNullOrWhiteSpace(request.PhoneNumber))
            .WithMessage("รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 081-234-5678 หรือ 02-123-4567)");
        RuleFor(request => request.BirthDate)
            .Must(date => !date.HasValue || date.Value <= DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("วันเกิดต้องไม่เป็นวันที่ในอนาคต");
    }
}
