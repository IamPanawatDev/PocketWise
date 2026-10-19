using FluentValidation;
using PocketWise.Application.DTOs.Settings;
using PocketWise.Domain.Enums;

namespace PocketWise.Application.Validators;

public class UpdateUserSettingsValidator : AbstractValidator<UpdateUserSettingsRequest>
{
    public UpdateUserSettingsValidator()
    {
        RuleFor(request => request.Theme)
            .IsInEnum();
        RuleFor(request => request.CurrencyCode)
            .NotEmpty()
            .Length(3)
            .Matches("^[A-Z]{3}$")
            .WithMessage("สกุลเงินต้องเป็นรหัส ISO 4217 ตัวพิมพ์ใหญ่ 3 ตัว");
        RuleFor(request => request.Locale)
            .NotEmpty()
            .Length(2, 10)
            .Matches("^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$")
            .WithMessage("รูปแบบ locale ไม่ถูกต้อง");
    }
}
