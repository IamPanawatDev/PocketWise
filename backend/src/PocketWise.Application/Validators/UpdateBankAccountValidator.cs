using FluentValidation;
using PocketWise.Application.DTOs.BankAccounts;

namespace PocketWise.Application.Validators;

public class UpdateBankAccountValidator : AbstractValidator<UpdateBankAccountRequest>
{
    public UpdateBankAccountValidator()
    {
        RuleFor(x => x.BankName).NotEmpty().MaximumLength(100).WithMessage("ต้องระบุชื่อธนาคาร");
        RuleFor(x => x.AccountName).NotEmpty().MaximumLength(100).WithMessage("ต้องระบุชื่อบัญชี");
        RuleFor(x => x.BankCode)
            .MaximumLength(10)
            .Matches(@"^[A-Za-z0-9]{2,10}$")
            .When(x => !string.IsNullOrWhiteSpace(x.BankCode))
            .WithMessage("รหัสธนาคารต้องเป็นตัวอักษรภาษาอังกฤษหรือตัวเลข 2-10 ตัวอักษร (เช่น 004 หรือ KBANK)");
        RuleFor(x => x.AccountNumberMasked).MaximumLength(30);
    }
}
