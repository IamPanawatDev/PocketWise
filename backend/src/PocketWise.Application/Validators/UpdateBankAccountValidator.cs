using FluentValidation;
using PocketWise.Application.DTOs.BankAccounts;

namespace PocketWise.Application.Validators;

public class UpdateBankAccountValidator : AbstractValidator<UpdateBankAccountRequest>
{
    public UpdateBankAccountValidator()
    {
        RuleFor(x => x.BankName).NotEmpty().MaximumLength(100).WithMessage("ต้องระบุชื่อธนาคาร");
        RuleFor(x => x.AccountName).NotEmpty().MaximumLength(100).WithMessage("ต้องระบุชื่อบัญชี");
        RuleFor(x => x.BankCode).MaximumLength(30);
        RuleFor(x => x.AccountNumberMasked).MaximumLength(30);
    }
}
