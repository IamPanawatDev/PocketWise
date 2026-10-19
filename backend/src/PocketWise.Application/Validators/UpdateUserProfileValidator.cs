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
            .MaximumLength(30);
        RuleFor(request => request.BirthDate)
            .Must(date => !date.HasValue || date.Value <= DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("วันเกิดต้องไม่เป็นวันที่ในอนาคต");
    }
}
